import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setAccessToken } from '@/services/cloudApi'

interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  name: string | null
  role: 'admin' | 'normal' | 'super_admin' | null
  venueId: string | null
  venueName: string | null
  accessToken: string | null
  login: (user: {
    id: string
    name: string
    role: 'admin' | 'normal' | 'super_admin'
    venueId: string | null
    venueName: string | null
  }, token?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      userId: null,
      name: null,
      role: null,
      venueId: null,
      venueName: null,
      accessToken: null,
      login: (user, token) => {
        if (token) setAccessToken(token)
        set({
          isAuthenticated: true,
          userId: user.id,
          name: user.name,
          role: user.role,
          venueId: user.venueId,
          venueName: user.venueName,
          accessToken: token || get().accessToken,
        })
      },
      logout: () => {
        setAccessToken(null)
        set({
          isAuthenticated: false,
          userId: null,
          name: null,
          role: null,
          venueId: null,
          venueName: null,
          accessToken: null,
        })
      },
    }),
    {
      name: 'vz-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        name: state.name,
        role: state.role,
        venueId: state.venueId,
        venueName: state.venueName,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore in-memory token as soon as localStorage is loaded
        // This runs before any useEffect, preventing race conditions
        if (state?.accessToken) {
          setAccessToken(state.accessToken)
        }
      },
    },
  ),
)
