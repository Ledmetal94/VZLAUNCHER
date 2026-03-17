import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'

interface PendingConsumption {
  id: string
  amount: number
  gameId: string
  sessionId?: string
  operatorId?: string
  timestamp: number
  retryCount: number
}

interface TokenState {
  balance: number
  pendingConsumptions: PendingConsumption[]
  loading: boolean
  lastSyncedAt: number | null
  setBalance: (balance: number) => void
  syncBalance: () => Promise<void>
  consumeLocal: (amount: number, gameId: string, sessionId?: string) => boolean
  reconcile: () => Promise<void>
}

const CLOUD_URL = import.meta.env.VITE_CLOUD_URL || 'http://localhost:3002'
const MAX_RETRIES = 5

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      balance: 0,
      pendingConsumptions: [],
      loading: false,
      lastSyncedAt: null,

      setBalance: (balance) => set({ balance }),

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
            // Cloud balance is authoritative — pending consumptions are already deducted locally
            // and will be synced on reconcile. Use cloud balance directly.
            set({ balance: data.balance, lastSyncedAt: Date.now() })
          }
        } catch {
          // Offline — keep local balance
        } finally {
          set({ loading: false })
        }
      },

      consumeLocal: (amount, gameId, sessionId) => {
        const state = get()
        if (state.balance < amount) return false

        // Get operator ID from auth store
        let operatorId: string | undefined
        try {
          const authStore = JSON.parse(localStorage.getItem('vz-auth') || '{}')
          operatorId = authStore?.state?.userId
        } catch { /* ignore */ }

        const pending: PendingConsumption = {
          id: crypto.randomUUID(),
          amount,
          gameId,
          sessionId,
          operatorId,
          timestamp: Date.now(),
          retryCount: 0,
        }

        set({
          balance: state.balance - amount,
          pendingConsumptions: [...state.pendingConsumptions, pending],
        })

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
                    pendingConsumptions: s.pendingConsumptions.filter((p) => p.id !== pending.id),
                  }))
                }
              })
              .catch(() => {
                // Will retry on reconcile
              })
          }
        })

        return true
      },

      reconcile: async () => {
        const state = get()
        if (state.pendingConsumptions.length === 0) {
          await get().syncBalance()
          return
        }

        const { getAccessToken } = await import('@/services/cloudApi')
        const token = getAccessToken()
        if (!token) return

        const remaining: PendingConsumption[] = []
        let synced = 0

        for (const pending of state.pendingConsumptions) {
          // Skip items that exceeded max retries
          if (pending.retryCount >= MAX_RETRIES) {
            toast.error(`Consumo gettoni fallito per gioco ${pending.gameId.slice(0, 8)} — max tentativi raggiunto`)
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
                amount: pending.amount,
                gameId: pending.gameId,
                sessionId: pending.sessionId,
              }),
              signal: AbortSignal.timeout(10000),
            })
            if (res.ok) {
              synced++
            } else {
              remaining.push({ ...pending, retryCount: pending.retryCount + 1 })
            }
          } catch {
            remaining.push({ ...pending, retryCount: pending.retryCount + 1 })
          }
        }

        set({ pendingConsumptions: remaining })

        if (synced > 0) {
          toast.success(`${synced} consumo/i gettoni sincronizzati`)
        }
        if (remaining.length > 0) {
          toast.warning(`${remaining.length} consumo/i in attesa di sincronizzazione`)
        }

        // Sync authoritative balance from cloud
        await get().syncBalance()
      },
    }),
    {
      name: 'vz-tokens',
      partialize: (state) => ({
        balance: state.balance,
        pendingConsumptions: state.pendingConsumptions,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
)
