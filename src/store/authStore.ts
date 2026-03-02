import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  operatorId: string | null
  operatorName: string | null
  login: (pin: string) => boolean
  logout: () => void
}

// Mock operators — replace with API call later
const OPERATORS = [
  { id: 'op1', name: 'Operator 1', pin: '1234' },
  { id: 'op2', name: 'Operator 2', pin: '5678' },
  { id: 'admin', name: 'Admin', pin: '0000' },
]

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      operatorId: null,
      operatorName: null,

      login: (pin: string) => {
        const operator = OPERATORS.find((o) => o.pin === pin)
        if (operator) {
          set({ isAuthenticated: true, operatorId: operator.id, operatorName: operator.name })
          return true
        }
        return false
      },

      logout: () => {
        set({ isAuthenticated: false, operatorId: null, operatorName: null })
      },
    }),
    { name: 'vz-auth' }
  )
)
