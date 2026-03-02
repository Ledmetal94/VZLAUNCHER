import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cloudLogin, setCloudToken } from '../services/cloudApi'

interface AuthState {
  isAuthenticated: boolean
  operatorId: string | null
  operatorName: string | null
  role: string | null
  token: string | null
  login: (pin: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      operatorId: null,
      operatorName: null,
      role: null,
      token: null,

      login: async (pin: string) => {
        try {
          const { token, operator } = await cloudLogin(pin)
          setCloudToken(token)
          set({
            isAuthenticated: true,
            operatorId: operator.id,
            operatorName: operator.name,
            role: operator.role,
            token,
          })
          return true
        } catch {
          return false
        }
      },

      logout: () => {
        setCloudToken(null)
        set({ isAuthenticated: false, operatorId: null, operatorName: null, role: null, token: null })
      },
    }),
    {
      name: 'vz-auth',
      // Rehydrate token into memory on load
      onRehydrateStorage: () => (state) => {
        if (state?.token) setCloudToken(state.token)
      },
    }
  )
)
