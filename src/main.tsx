import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from 'sonner'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineBar from './components/OfflineBar'

// Unregister any existing service workers — they cache stale builds on LAN deploys
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister())
  })
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
      <App />
      <OfflineBar />
      </ErrorBoundary>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(22,20,45,0.95)',
            border: '1px solid rgba(123,100,169,0.25)',
            color: '#fff',
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
          },
        }}
        richColors
      />
    </BrowserRouter>
  </StrictMode>,
)
