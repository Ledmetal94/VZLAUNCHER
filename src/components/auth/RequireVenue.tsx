import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useVenueStore } from '../../store/venueStore'

export function RequireVenue({ children }: { children: ReactNode }) {
  const isLoggedIn = useVenueStore((s) => s.isLoggedIn)
  if (!isLoggedIn) return <Navigate to="/venue-login" replace />
  return <>{children}</>
}
