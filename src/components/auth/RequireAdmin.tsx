import { Navigate } from 'react-router'
import { useAuthStore } from '@/store/authStore'

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.role)

  if (role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
