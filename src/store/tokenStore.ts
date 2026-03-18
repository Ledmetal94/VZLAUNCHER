import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'

// --- Transaction-based token ledger ---
// Balance is NEVER stored as a raw number.
// It is always derived from: initialBalance - sum(transactions).
// This makes it auditable, tamper-detectable, and impossible to "add coins by mistake."

interface TokenTransaction {
  id: string
  type: 'consume' | 'topup' | 'correction'
  amount: number // always positive
  gameId?: string
  sessionId?: string
  operatorId?: string
  timestamp: number
  syncedToCloud: boolean
  retryCount: number
}

interface TokenState {
  /** The last known loaded/topped-up balance (set by cloud or admin topup) */
  initialBalance: number
  /** Ordered transaction log — every deduction or topup is recorded */
  transactions: TokenTransaction[]
  loading: boolean
  lastSyncedAt: number | null
  /** Integrity checksum to detect localStorage tampering */
  _checksum: string

  // Computed
  readonly balance: number

  // Actions
  setInitialBalance: (balance: number) => void
  setBalance: (balance: number) => void
  syncBalance: () => Promise<void>
  consumeLocal: (amount: number, gameId: string, sessionId?: string) => boolean
  refundLocal: (amount: number, gameId: string, sessionId?: string) => void
  topup: (amount: number, reason?: string) => void
  reconcile: () => Promise<void>
  getTransactionLog: () => TokenTransaction[]
  verifyIntegrity: () => boolean
}

import { CLOUD_URL } from '@/config/cloudUrl'
const MAX_RETRIES = 5
const CHECKSUM_SECRET = 'vz-token-integrity-2026'

/** Compute balance from initial + transactions */
function computeBalance(initial: number, transactions: TokenTransaction[]): number {
  let balance = initial
  for (const tx of transactions) {
    if (tx.type === 'consume') {
      balance -= tx.amount
    } else if (tx.type === 'topup' || tx.type === 'correction') {
      balance += tx.amount
    }
  }
  return Math.max(0, balance)
}

/** Simple checksum to detect localStorage tampering */
function computeChecksum(initial: number, transactions: TokenTransaction[]): string {
  const data = `${CHECKSUM_SECRET}:${initial}:${transactions.map(t => `${t.id}:${t.type}:${t.amount}:${t.timestamp}`).join(',')}`
  // Simple hash — not cryptographically secure but catches casual tampering
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return `vz1:${hash.toString(36)}`
}

function getOperatorId(): string | undefined {
  try {
    const authStore = JSON.parse(localStorage.getItem('vz-auth') || '{}')
    return authStore?.state?.userId
  } catch { return undefined }
}

/** Helper: set state and recompute balance */
function setWithBalance(set: Function, _get: Function, partial: Record<string, unknown>) {
  set((state: TokenState) => {
    const merged = { ...state, ...partial }
    const initial = merged.initialBalance ?? state.initialBalance
    const txs = merged.transactions ?? state.transactions
    return { ...partial, balance: computeBalance(initial, txs) }
  })
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      initialBalance: 500,
      transactions: [],
      balance: 500,
      loading: false,
      lastSyncedAt: null,
      _checksum: '',

      setInitialBalance: (balance) => {
        const txs = get().transactions
        const checksum = computeChecksum(balance, txs)
        setWithBalance(set, get, { initialBalance: balance, _checksum: checksum })
      },

      setBalance: (balance) => {
        const unsynced = get().transactions.filter(t => !t.syncedToCloud)
        if (unsynced.length === 0) {
          const checksum = computeChecksum(balance, get().transactions)
          setWithBalance(set, get, { initialBalance: balance, _checksum: checksum })
        }
      },

      syncBalance: async () => {
        set({ loading: true })
        try {
          const { getAccessToken } = await import('@/services/cloudApi')
          const token = getAccessToken()
          if (!token) return

          const res = await fetch(`${CLOUD_URL}/api/v1/tokens/balance`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            signal: AbortSignal.timeout(10000),
          })
          if (res.ok) {
            const data = await res.json()
            const state = get()
            const unsynced = state.transactions.filter(t => !t.syncedToCloud)
            const currentBalance = computeBalance(state.initialBalance, state.transactions)

            if (unsynced.length === 0 && data.balance < currentBalance) {
              const checksum = computeChecksum(data.balance, state.transactions)
              setWithBalance(set, get, { initialBalance: data.balance, lastSyncedAt: Date.now(), _checksum: checksum })
            } else {
              set({ lastSyncedAt: Date.now() })
            }

            // Notify about recently confirmed credits (bank transfers, purchases)
            const recentCredits = data.recentCredits as Array<{ id: string; type: string; amount: number; payment_method: string; created_at: string }> | undefined
            if (recentCredits?.length) {
              const seenKey = 'vz-seen-credits'
              const seen: Set<string> = new Set(JSON.parse(localStorage.getItem(seenKey) || '[]'))
              const newCredits = recentCredits.filter(c => !seen.has(c.id))

              for (const c of newCredits) {
                seen.add(c.id)
                const method = c.payment_method === 'bank_transfer' ? 'Bonifico confermato'
                  : c.payment_method === 'stripe' ? 'Pagamento ricevuto'
                  : 'Credito ricevuto'
                toast.success(`${method}: +${c.amount} gettoni`)
              }

              if (newCredits.length) {
                // Keep only last 50 seen IDs to prevent unbounded growth
                const seenArr = [...seen].slice(-50)
                localStorage.setItem(seenKey, JSON.stringify(seenArr))
              }
            }
          }
        } catch {
          // Offline — keep local balance
        } finally {
          set({ loading: false })
        }
      },

      consumeLocal: (amount, gameId, sessionId) => {
        const state = get()
        const currentBalance = computeBalance(state.initialBalance, state.transactions)

        if (currentBalance < amount) return false
        if (amount <= 0) return false

        const tx: TokenTransaction = {
          id: crypto.randomUUID(),
          type: 'consume',
          amount,
          gameId,
          sessionId,
          operatorId: getOperatorId(),
          timestamp: Date.now(),
          syncedToCloud: false,
          retryCount: 0,
        }

        const newTxs = [...state.transactions, tx]
        const checksum = computeChecksum(state.initialBalance, newTxs)
        setWithBalance(set, get, { transactions: newTxs, _checksum: checksum })

        // Try to sync to cloud in background
        import('@/services/cloudApi').then(({ getAccessToken: getToken }) => {
          const token = getToken()
          if (token) {
            fetch(`${CLOUD_URL}/api/v1/tokens/consume`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              credentials: 'include',
              body: JSON.stringify({ amount, gameId, sessionId }),
              signal: AbortSignal.timeout(10000),
            })
              .then((res) => {
                if (res.ok) {
                  set((s) => ({
                    transactions: s.transactions.map(t =>
                      t.id === tx.id ? { ...t, syncedToCloud: true } : t
                    ),
                  }))
                }
              })
              .catch(() => { /* Will retry on reconcile */ })
          }
        })

        return true
      },

      refundLocal: (amount, gameId, sessionId) => {
        if (amount <= 0) return
        const state = get()
        const tx: TokenTransaction = {
          id: crypto.randomUUID(),
          type: 'correction',
          amount,
          gameId,
          sessionId,
          operatorId: getOperatorId(),
          timestamp: Date.now(),
          syncedToCloud: false,
          retryCount: 0,
        }
        const newTxs = [...state.transactions, tx]
        const checksum = computeChecksum(state.initialBalance, newTxs)
        setWithBalance(set, get, { transactions: newTxs, _checksum: checksum })

        // Sync refund to cloud in background
        import('@/services/cloudApi').then(({ getAccessToken: getToken }) => {
          const token = getToken()
          if (token) {
            fetch(`${CLOUD_URL}/api/v1/tokens/consume`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              credentials: 'include',
              body: JSON.stringify({ amount: -amount, gameId, sessionId, reason: 'launch_failed' }),
              signal: AbortSignal.timeout(10000),
            })
              .then((res) => {
                if (res.ok) {
                  set((s) => ({
                    transactions: s.transactions.map(t =>
                      t.id === tx.id ? { ...t, syncedToCloud: true } : t
                    ),
                  }))
                }
              })
              .catch(() => { /* Will retry on reconcile */ })
          }
        })
      },

      topup: (amount, _reason) => {
        if (amount <= 0) return
        const state = get()
        const tx: TokenTransaction = {
          id: crypto.randomUUID(),
          type: 'topup',
          amount,
          operatorId: getOperatorId(),
          timestamp: Date.now(),
          syncedToCloud: false,
          retryCount: 0,
        }
        const newTxs = [...state.transactions, tx]
        const checksum = computeChecksum(state.initialBalance, newTxs)
        setWithBalance(set, get, { transactions: newTxs, _checksum: checksum })
      },

      reconcile: async () => {
        const state = get()
        const unsynced = state.transactions.filter(t => !t.syncedToCloud && t.type === 'consume')

        if (unsynced.length === 0) {
          await get().syncBalance()
          return
        }

        const { getAccessToken } = await import('@/services/cloudApi')
        const token = getAccessToken()
        if (!token) return

        let synced = 0
        let failed = 0

        for (const tx of unsynced) {
          if (tx.retryCount >= MAX_RETRIES) {
            toast.error(`Consumo gettoni fallito (${tx.gameId?.slice(0, 8)}) — max tentativi`)
            continue
          }

          try {
            const res = await fetch(`${CLOUD_URL}/api/v1/tokens/consume`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              credentials: 'include',
              body: JSON.stringify({
                amount: tx.amount,
                gameId: tx.gameId,
                sessionId: tx.sessionId,
              }),
              signal: AbortSignal.timeout(10000),
            })
            if (res.ok) {
              set((s) => ({
                transactions: s.transactions.map(t =>
                  t.id === tx.id ? { ...t, syncedToCloud: true } : t
                ),
              }))
              synced++
            } else {
              set((s) => ({
                transactions: s.transactions.map(t =>
                  t.id === tx.id ? { ...t, retryCount: t.retryCount + 1 } : t
                ),
              }))
              failed++
            }
          } catch {
            set((s) => ({
              transactions: s.transactions.map(t =>
                t.id === tx.id ? { ...t, retryCount: t.retryCount + 1 } : t
              ),
            }))
            failed++
          }
        }

        if (synced > 0) toast.success(`${synced} consumo/i gettoni sincronizzati`)
        if (failed > 0) toast.warning(`${failed} consumo/i in attesa`)

        await get().syncBalance()
      },

      getTransactionLog: () => {
        return [...get().transactions].sort((a, b) => b.timestamp - a.timestamp)
      },

      verifyIntegrity: () => {
        const state = get()
        const expected = computeChecksum(state.initialBalance, state.transactions)
        return state._checksum === expected
      },
    }),
    {
      name: 'vz-tokens',
      partialize: (state) => ({
        initialBalance: state.initialBalance,
        transactions: state.transactions,
        lastSyncedAt: state.lastSyncedAt,
        _checksum: state._checksum,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // Recompute balance from transactions
        ;(state as { balance: number }).balance = computeBalance(state.initialBalance, state.transactions)
        // Verify integrity
        const expected = computeChecksum(state.initialBalance, state.transactions)
        if (state._checksum && state._checksum !== expected) {
          console.error('[TOKEN STORE] Integrity check FAILED — possible tampering detected')
          toast.error('Anomalia rilevata nel saldo gettoni — contattare supporto')
        }
      },
    },
  ),
)
