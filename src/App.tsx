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
import { RequireAuth } from './components/auth/RequireVenue'
import { usePWAUpdate } from './hooks/usePWAUpdate'

export default function App() {
  usePWAUpdate()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/catalog" element={<RequireAuth><CatalogPage /></RequireAuth>} />
        <Route path="/game/:slug" element={<RequireAuth><GameDetailPage /></RequireAuth>} />
        <Route path="/launch/:slug" element={<RequireAuth><LaunchPage /></RequireAuth>} />
        <Route path="/session/active" element={<RequireAuth><ActiveSessionPage /></RequireAuth>} />
        <Route path="/sessions" element={<RequireAuth><SessionsPage /></RequireAuth>} />
        <Route path="/tutorial/:slug" element={<RequireAuth><TutorialPage /></RequireAuth>} />
        <Route path="/admin/config" element={<RequireAuth><AdminConfigPage /></RequireAuth>} />
        <Route path="/admin/tutorials" element={<RequireAuth><AdminTutorialsPage /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
