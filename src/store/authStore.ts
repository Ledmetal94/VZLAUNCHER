import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  name: string | null
  role: 'admin' | 'normal' | 'super_admin' | null
  venueId: string | null
  venueName: string | null
  login: (user: {
    id: string
    name: string
    role: 'admin' | 'normal' | 'super_admin'
    venueId: string | null
    venueName: string | null
  }) => void
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
      login: (user) =>
        set({
          isAuthenticated: true,
          userId: user.id,
          name: user.name,
          role: user.role,
          venueId: user.venueId,
          venueName: user.venueName,
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          userId: null,
          name: null,
          role: null,
          venueId: null,
          venueName: null,
        }),
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
      }),
    },
  ),
)
