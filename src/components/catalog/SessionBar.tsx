import { useEffect } from 'react'
import { cn } from '@/lib/utils'
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

  return (
    <div className="glass flex h-14 shrink-0 items-center gap-6 px-6">
      {/* Status dot */}
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        <span className="text-sm font-semibold text-white">Active</span>
      </div>

      {/* Game info */}
      <span className="text-sm text-white">
        {session.gameName} · {session.category.replace('_', ' ')}
      </span>

      {/* Players */}
      <span className="text-sm text-muted">
        Players: {session.players}
      </span>

      {/* Timer + progress bar */}
      <div className="flex flex-1 items-center gap-3">
        <span className="font-mono text-sm text-white">
          {formatDuration(session.elapsed)}
        </span>
        <div className="flex-1 h-2 rounded-full bg-surface-light overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000',
              progress < 80 ? 'bg-primary' : progress < 95 ? 'bg-warning' : 'bg-danger',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-sm text-muted">
          {formatDuration(Math.max(0, session.durationPlanned - session.elapsed))}
        </span>
      </div>

      {/* End button */}
      <button
        onClick={onEnd}
        disabled={ending}
        className={cn(
          'rounded-lg bg-danger/20 px-4 py-1.5 text-sm font-semibold text-danger',
          'transition hover:bg-danger/30',
          'disabled:opacity-50',
        )}
      >
        {ending ? 'Ending...' : 'End'}
      </button>
    </div>
  )
}
