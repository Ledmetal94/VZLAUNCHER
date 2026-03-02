import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { VenueLoginPage } from './pages/VenueLoginPage'
import { CatalogPage } from './pages/CatalogPage'
import { GameDetailPage } from './pages/GameDetailPage'
import { LaunchPage } from './pages/LaunchPage'
import { SessionsPage } from './pages/SessionsPage'
import { ActiveSessionPage } from './pages/ActiveSessionPage'
import { TutorialPage } from './pages/TutorialPage'
import { AdminConfigPage } from './pages/AdminConfigPage'
import { AdminTutorialsPage } from './pages/AdminTutorialsPage'
import { RequireVenue } from './components/auth/RequireVenue'
import { usePWAUpdate } from './hooks/usePWAUpdate'

export default function App() {
  usePWAUpdate()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/venue-login" element={<VenueLoginPage />} />

        <Route path="/catalog" element={<RequireVenue><CatalogPage /></RequireVenue>} />
        <Route path="/game/:slug" element={<RequireVenue><GameDetailPage /></RequireVenue>} />
        <Route path="/launch/:slug" element={<RequireVenue><LaunchPage /></RequireVenue>} />
        <Route path="/session/active" element={<RequireVenue><ActiveSessionPage /></RequireVenue>} />
        <Route path="/sessions" element={<RequireVenue><SessionsPage /></RequireVenue>} />
        <Route path="/tutorial/:slug" element={<RequireVenue><TutorialPage /></RequireVenue>} />
        <Route path="/admin/config" element={<RequireVenue><AdminConfigPage /></RequireVenue>} />
        <Route path="/admin/tutorials" element={<RequireVenue><AdminTutorialsPage /></RequireVenue>} />

        <Route path="*" element={<Navigate to="/venue-login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
