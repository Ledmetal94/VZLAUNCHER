import { useEffect } from 'react'
import { formatDuration } from '@/lib/utils'
import { useSessionStore } from '@/store/sessionStore'

interface SessionBarProps {
  onEnd: () => void
  ending: boolean
}

export default function SessionBar({ onEnd, ending }: SessionBarProps) {
  const session = useSessionStore((s) => s.activeSession)
  const tick = useSessionStore((s) => s.tick)

  useEffect(() => {
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [tick])

  if (!session) return null

  const progress = Math.min(100, (session.elapsed / session.durationPlanned) * 100)
  const barColor = progress < 80 ? '#E6007E' : progress < 95 ? '#f59e0b' : '#ff4444'

  return (
    <div
      style={{
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '0 24px',
        background: 'rgba(15,14,31,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(123,100,169,0.12)',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      {/* Status dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E6007E', animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Attivo</span>
      </div>

      {/* Game info */}
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
        {session.gameName} · {session.category.replace('_', ' ')}
      </span>

      {/* Players */}
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
        Giocatori: {session.players}
      </span>

      {/* Timer + progress bar */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', minWidth: 50 }}>
          {formatDuration(session.elapsed)}
        </span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(123,100,169,0.15)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 3,
              background: barColor,
              width: `${progress}%`,
              transition: 'width 1s linear, background 0.3s',
              boxShadow: `0 0 8px ${barColor}40`,
            }}
          />
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums', minWidth: 50 }}>
          {formatDuration(Math.max(0, session.durationPlanned - session.elapsed))}
        </span>
      </div>

      {/* End button */}
      <button
        onClick={onEnd}
        disabled={ending}
        style={{
          padding: '6px 16px',
          borderRadius: 8,
          border: '1px solid rgba(255,68,68,0.25)',
          background: 'rgba(255,68,68,0.1)',
          color: '#ff4444',
          fontSize: 12,
          fontWeight: 700,
          cursor: ending ? 'not-allowed' : 'pointer',
          opacity: ending ? 0.5 : 1,
          fontFamily: 'Outfit, sans-serif',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { if (!ending) { e.currentTarget.style.background = 'rgba(255,68,68,0.2)' } }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,68,68,0.1)' }}
      >
        {ending ? 'Arresto...' : 'Termina'}
      </button>
    </div>
  )
}
