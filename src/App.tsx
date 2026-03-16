import { Routes, Route, Navigate } from 'react-router'
import LoginPage from '@/pages/LoginPage'
import CatalogPage from '@/pages/CatalogPage'
import HistoryPage from '@/pages/HistoryPage'
import CheckoutReturnPage from '@/pages/CheckoutReturnPage'
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
      <Route
        path="/history"
        element={
          <RequireAuth>
            <HistoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/checkout/return"
        element={
          <RequireAuth>
            <CheckoutReturnPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
