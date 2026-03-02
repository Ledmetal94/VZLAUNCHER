import { useEffect } from 'react'

const CHECK_INTERVAL_MS = 5 * 60 * 1000 // check every 5 minutes

/**
 * Periodically checks for a new service worker version.
 * When a new SW activates (after skipWaiting), the page reloads to load fresh assets.
 * Critical for kiosk use — the app may run all day without a manual reload.
 */
export function usePWAUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Reload when a new SW takes control
    const onControllerChange = () => window.location.reload()
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    // Periodically ping the SW registration for updates
    const interval = setInterval(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        await reg?.update()
      } catch {
        // ignore network errors during update check
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      clearInterval(interval)
    }
  }, [])
}
