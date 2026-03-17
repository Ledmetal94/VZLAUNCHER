import { Routes, Route, Navigate } from 'react-router'
import { lazy, Suspense, useEffect } from 'react'
import LoginPage from '@/pages/LoginPage'
import CatalogPage from '@/pages/CatalogPage'
import HistoryPage from '@/pages/HistoryPage'
import RequireAuth from '@/components/auth/RequireAuth'
import RequireAdmin from '@/components/auth/RequireAdmin'
import RequireSuperAdmin from '@/components/auth/RequireSuperAdmin'
import PageTransition from '@/components/PageTransition'

// Lazy-load admin-only pages
const CheckoutReturnPage = lazy(() => import('@/pages/CheckoutReturnPage'))
const OperatorsPage = lazy(() => import('@/pages/OperatorsPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const GamesAdminPage = lazy(() => import('@/pages/GamesAdminPage'))
const SuperAdminLoginPage = lazy(() => import('@/pages/SuperAdminLoginPage'))
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard'))
const SuperAdminOperatorsPage = lazy(() => import('@/pages/SuperAdminOperatorsPage'))
import { useAlerts } from '@/hooks/useAlerts'
import { useSessionStore } from '@/store/sessionStore'

export default function App() {
  useAlerts()

  // Listen for Background Sync requests from service worker
  useEffect(() => {
    const bc = new BroadcastChannel('vz-sync')
    bc.onmessage = (event) => {
      if (event.data?.type === 'SYNC_SESSIONS_REQUESTED') {
        useSessionStore.getState().syncAllPending().catch(() => {})
      }
    }
    return () => bc.close()
  }, [])
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center" style={{ background: 'var(--color-surface)' }}><span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Caricamento...</span></div>}>
    <PageTransition>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
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
            <RequireAdmin>
              <CheckoutReturnPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/operators"
        element={
          <RequireAuth>
            <RequireAdmin>
              <OperatorsPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/games"
        element={
          <RequireAuth>
            <RequireAdmin>
              <GamesAdminPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/analytics"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AnalyticsPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/super-admin"
        element={
          <RequireAuth>
            <RequireSuperAdmin>
              <SuperAdminDashboard />
            </RequireSuperAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/super-admin/operators"
        element={
          <RequireAuth>
            <RequireSuperAdmin>
              <SuperAdminOperatorsPage />
            </RequireSuperAdmin>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </PageTransition>
    </Suspense>
  )
}
