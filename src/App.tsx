import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { CatalogPage } from './pages/CatalogPage'
import { GameDetailPage } from './pages/GameDetailPage'
import { LaunchPage } from './pages/LaunchPage'
import { SessionsPage } from './pages/SessionsPage'
import { ActiveSessionPage } from './pages/ActiveSessionPage'
import { TutorialPage } from './pages/TutorialPage'
import { AdminConfigPage } from './pages/AdminConfigPage'
import { AdminTutorialsPage } from './pages/AdminTutorialsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AdminVenuePage } from './pages/AdminVenuePage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { RequireAuth, RequireAdmin } from './components/auth/RequireVenue'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { usePWAUpdate } from './hooks/usePWAUpdate'

export default function App() {
  usePWAUpdate()

  return (
    <BrowserRouter>
      <SettingsPanel />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/catalog" element={<RequireAuth><CatalogPage /></RequireAuth>} />
        <Route path="/game/:slug" element={<RequireAuth><GameDetailPage /></RequireAuth>} />
        <Route path="/launch/:slug" element={<RequireAuth><LaunchPage /></RequireAuth>} />
        <Route path="/session/active" element={<RequireAuth><ActiveSessionPage /></RequireAuth>} />
        <Route path="/sessions" element={<RequireAuth><SessionsPage /></RequireAuth>} />
        <Route path="/analytics" element={<RequireAdmin><AnalyticsPage /></RequireAdmin>} />
        <Route path="/tutorial/:slug" element={<RequireAuth><TutorialPage /></RequireAuth>} />
        <Route path="/admin/config" element={<RequireAdmin><AdminConfigPage /></RequireAdmin>} />
        <Route path="/admin/tutorials" element={<RequireAdmin><AdminTutorialsPage /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="/admin/venue" element={<RequireAdmin><AdminVenuePage /></RequireAdmin>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
