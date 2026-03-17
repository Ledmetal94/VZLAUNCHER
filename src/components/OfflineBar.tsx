import { useState, useEffect, useCallback, useRef } from 'react'
import { useConnectionStore } from '@/store/connectionStore'

export default function OfflineBar() {
  const cloudStatus = useConnectionStore((s) => s.cloudStatus)
  const bridgeStatus = useConnectionStore((s) => s.bridgeStatus)

  const cloudOffline = cloudStatus === 'offline'
  const bridgeOffline = bridgeStatus === 'offline'

  const [showCloud, setShowCloud] = useState(false)
  const [showBridge, setShowBridge] = useState(false)
  const dismissedRef = useRef<Set<string>>(new Set())

  // Debounce cloud offline (500ms)
  useEffect(() => {
    if (cloudOffline && !dismissedRef.current.has('cloud')) {
      const timer = setTimeout(() => setShowCloud(true), 500)
      return () => clearTimeout(timer)
    }
    setShowCloud(false)
    if (!cloudOffline) {
      dismissedRef.current.delete('cloud')
    }
  }, [cloudOffline])

  // Debounce bridge offline (500ms), then auto-dismiss after 5s
  useEffect(() => {
    if (bridgeOffline && !dismissedRef.current.has('bridge')) {
      const showTimer = setTimeout(() => setShowBridge(true), 500)
      const hideTimer = setTimeout(() => {
        setShowBridge(false)
        dismissedRef.current.add('bridge')
      }, 5500)
      return () => {
        clearTimeout(showTimer)
        clearTimeout(hideTimer)
      }
    }
    setShowBridge(false)
    if (!bridgeOffline) {
      dismissedRef.current.delete('bridge')
    }
  }, [bridgeOffline])

  const dismiss = useCallback((key: string) => {
    dismissedRef.current.add(key)
    if (key === 'cloud') setShowCloud(false)
    if (key === 'bridge') setShowBridge(false)
  }, [])

  const chips: Array<{ key: string; label: string; color: string }> = []

  if (showCloud) {
    chips.push({ key: 'cloud', label: 'Cloud non raggiungibile', color: '#ff6b6b' })
  }
  if (showBridge) {
    chips.push({ key: 'bridge', label: 'Bridge locale offline', color: '#f59e0b' })
  }

  if (chips.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {chips.map((chip) => (
        <div
          key={chip.key}
          role="status"
          aria-live="polite"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px 6px 12px',
            borderRadius: 9999,
            background: 'rgba(15,14,31,0.85)',
            border: `1px solid ${chip.color}30`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 12px ${chip.color}10`,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'Outfit, sans-serif',
            color: chip.color,
            animation: 'offlineChipIn 0.3s ease-out',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: chip.color,
              flexShrink: 0,
              opacity: 0.9,
            }}
          />
          {chip.label}
          <button
            onClick={() => dismiss(chip.key)}
            aria-label="Chiudi"
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: 'none',
              background: `${chip.color}18`,
              color: chip.color,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <style>{`
        @keyframes offlineChipIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
