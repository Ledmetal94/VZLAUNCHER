import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PendingConsumption {
  id: string
  amount: number
  gameId: string
  sessionId?: string
  timestamp: number
}

interface TokenState {
  balance: number
  pendingConsumptions: PendingConsumption[]
  loading: boolean
  setBalance: (balance: number) => void
  syncBalance: () => Promise<void>
  consumeLocal: (amount: number, gameId: string, sessionId?: string) => boolean
  reconcile: () => Promise<void>
}

const CLOUD_URL = import.meta.env.VITE_CLOUD_URL || 'http://localhost:3002'

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      balance: 0,
      pendingConsumptions: [],
      loading: false,

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
          })
          if (res.ok) {
            const data = await res.json()
            set({ balance: data.balance })
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

        const pending: PendingConsumption = {
          id: crypto.randomUUID(),
          amount,
          gameId,
          sessionId,
          timestamp: Date.now(),
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
          })
            .then((res) => {
              if (res.ok) {
                // Remove from pending
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
          // Just sync balance from cloud
          await get().syncBalance()
          return
        }

        const { getAccessToken } = await import('@/services/cloudApi')
        const token = getAccessToken()
        if (!token) return

        // Retry pending consumptions
        const remaining: PendingConsumption[] = []
        for (const pending of state.pendingConsumptions) {
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
            })
            if (!res.ok) remaining.push(pending)
          } catch {
            remaining.push(pending)
          }
        }

        set({ pendingConsumptions: remaining })

        // Sync authoritative balance from cloud
        await get().syncBalance()
      },
    }),
    {
      name: 'vz-tokens',
      partialize: (state) => ({
        balance: state.balance,
        pendingConsumptions: state.pendingConsumptions,
      }),
    },
  ),
)
