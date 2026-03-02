import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { reportError } from './services/errorInbox.ts'

// Catch uncaught runtime errors
window.addEventListener('error', (event) => {
  reportError(
    event.error?.message || event.message,
    event.message,
    event.error?.stack,
  )
})

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const err = event.reason
  reportError(
    err?.message || String(err),
    String(err),
    err?.stack,
  )
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
