import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { login as cloudLogin, setToken } from '../services/cloudApi'

interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  name: string | null
  role: string | null       // 'admin' | 'normal'
  venueId: string | null
  venueName: string | null
  token: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      name: null,
      role: null,
      venueId: null,
      venueName: null,
      token: null,

      login: async (username: string, password: string) => {
        try {
          const { token, user } = await cloudLogin(username, password)
          setToken(token)
          set({
            isAuthenticated: true,
            userId: user.id,
            name: user.name,
            role: user.role,
            venueId: user.venueId,
            venueName: user.venueName,
            token,
          })
          return true
        } catch {
          return false
        }
      },

      logout: () => {
        setToken(null)
        set({
          isAuthenticated: false,
          userId: null,
          name: null,
          role: null,
          venueId: null,
          venueName: null,
          token: null,
        })
      },
    }),
    {
      name: 'vz-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) setToken(state.token)
      },
    }
  )
)
