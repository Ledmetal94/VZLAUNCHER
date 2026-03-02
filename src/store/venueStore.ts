import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setVenueToken } from '../services/cloudApi'

interface VenueInfo {
  id: string
  name: string
  username: string
  timezone: string
  currency: string
  logoUrl: string | null
}

interface VenueState {
  isLoggedIn: boolean
  token: string | null
  venue: VenueInfo | null
  setVenue: (token: string, venue: VenueInfo) => void
  logout: () => void
}

export const useVenueStore = create<VenueState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      token: null,
      venue: null,

      setVenue: (token, venue) => {
        setVenueToken(token)
        set({ isLoggedIn: true, token, venue })
      },

      logout: () => {
        setVenueToken(null)
        set({ isLoggedIn: false, token: null, venue: null })
      },
    }),
    {
      name: 'vz-venue',
      onRehydrateStorage: () => (state) => {
        if (state?.token) setVenueToken(state.token)
      },
    }
  )
)
