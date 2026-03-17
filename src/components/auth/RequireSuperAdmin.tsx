import { Navigate } from 'react-router'
import { useAuthStore } from '@/store/authStore'

export default function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.role)

  if (role !== 'super_admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
