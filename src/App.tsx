import { Routes, Route, Navigate } from 'react-router'
import LoginPage from '@/pages/LoginPage'
import CatalogPage from '@/pages/CatalogPage'
import RequireAuth from '@/components/auth/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <CatalogPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
