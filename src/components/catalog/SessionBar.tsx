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
      className="flex shrink-0 items-center gap-4 xl:gap-6 px-5 xl:px-6"
      style={{
        minHeight: 56,
        background: 'rgba(15,14,31,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(123,100,169,0.12)',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      {/* Status dot */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#E6007E] animate-pulse shrink-0" />
        <span className="text-sm font-bold text-white">Attivo</span>
      </div>

      {/* Game info */}
      <span className="hidden sm:block text-sm font-medium text-white/70 truncate">
        {session.gameName} · {session.category.replace('_', ' ')}
      </span>

      {/* Players */}
      <span className="hidden md:block text-xs font-medium text-white/40 shrink-0">
        Giocatori: {session.players}
      </span>

      {/* Timer + progress bar */}
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <span className="text-sm font-bold text-white tabular-nums shrink-0 min-w-[48px]">
          {formatDuration(session.elapsed)}
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(123,100,169,0.15)' }}>
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
        <span className="text-xs text-white/35 tabular-nums shrink-0 min-w-[48px] hidden sm:block">
          {formatDuration(Math.max(0, session.durationPlanned - session.elapsed))}
        </span>
      </div>

      {/* End button — large touch target */}
      <button
        onClick={onEnd}
        disabled={ending}
        className="
          shrink-0 min-h-[44px] px-4 xl:px-5 rounded-lg text-sm font-bold
          transition-all duration-150
          hover:bg-[rgba(255,68,68,0.2)] active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        style={{
          border: '1px solid rgba(255,68,68,0.25)',
          background: 'rgba(255,68,68,0.1)',
          color: '#ff4444',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        {ending ? 'Arresto...' : 'Termina'}
      </button>
    </div>
  )
}
