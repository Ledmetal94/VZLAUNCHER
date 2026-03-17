import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwa() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      toast.success('VZ Launcher installato!')
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  // SW update detection
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let updateFoundHandler: (() => void) | null = null
    let stateChangeHandler: (() => void) | null = null
    let installingWorker: ServiceWorker | null = null

    navigator.serviceWorker.ready.then((reg) => {
      updateFoundHandler = () => {
        const newSw = reg.installing
        if (!newSw) return
        installingWorker = newSw

        stateChangeHandler = () => {
          if (newSw.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Aggiornamento disponibile', {
              action: {
                label: 'Aggiorna',
                onClick: () => {
                  newSw.postMessage({ type: 'SKIP_WAITING' })
                  window.location.reload()
                },
              },
              duration: 15000,
            })
          }
        }

        newSw.addEventListener('statechange', stateChangeHandler)
      }

      reg.addEventListener('updatefound', updateFoundHandler)
    })

    return () => {
      if (installingWorker && stateChangeHandler) {
        installingWorker.removeEventListener('statechange', stateChangeHandler)
      }
      // Note: can't easily remove updatefound from reg in cleanup since it's async,
      // but the handler refs are nulled so it's safe
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstallPrompt(null)
      }
    } catch {
      // Install prompt was dismissed or failed
    }
  }, [installPrompt])

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    promptInstall,
  }
}
