import { useState, useEffect } from 'react'
import { useConnectionStore } from '@/store/connectionStore'

export default function OfflineBar() {
  const cloudStatus = useConnectionStore((s) => s.cloudStatus)
  const bridgeStatus = useConnectionStore((s) => s.bridgeStatus)

  const isOffline = cloudStatus === 'offline' || bridgeStatus === 'offline'

  // Debounce: only show after 500ms of being offline (prevents flicker)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOffline) {
      const timer = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [isOffline])

  if (!visible) return null

  const parts: string[] = []
  if (cloudStatus === 'offline') parts.push('Cloud')
  if (bridgeStatus === 'offline') parts.push('Bridge')

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: 'rgba(245,158,11,0.12)',
        borderBottom: '1px solid rgba(245,158,11,0.25)',
        backdropFilter: 'blur(8px)',
        fontSize: 11,
        fontWeight: 600,
        color: '#f59e0b',
        animation: 'pageIn 0.3s ease-out',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
      </svg>
      Sei offline ({parts.join(' + ')}) — i dati verranno sincronizzati al ripristino della connessione
    </div>
  )
}
