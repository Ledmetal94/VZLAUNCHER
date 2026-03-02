import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const operatorId = useAuthStore((s) => s.operatorId)
  if (operatorId !== 'admin') return <Navigate to="/catalog" replace />
  return <>{children}</>
}
