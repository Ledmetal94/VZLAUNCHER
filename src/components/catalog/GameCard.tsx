import { cn } from '@/lib/utils'
import type { Game } from '@/types/models'

const GRADIENT_COLORS: Record<string, string> = {
  arcade_light: 'from-blue-600/40 to-blue-900/60',
  arcade_full: 'from-red-600/40 to-red-900/60',
  avventura: 'from-emerald-600/40 to-emerald-900/60',
  lasergame: 'from-violet-600/40 to-violet-900/60',
  escape: 'from-amber-600/40 to-amber-900/60',
}

const BADGE_COLORS: Record<string, string> = {
  NEW: 'bg-success text-white',
  HOT: 'bg-orange-500 text-white',
  TOP: 'bg-primary text-white',
}

const CATEGORY_LABELS: Record<string, string> = {
  arcade_light: 'Arcade Light',
  arcade_full: 'Arcade Full',
  avventura: 'Avventura',
  lasergame: 'Laser Game',
  escape: 'Escape Room',
}

interface GameCardProps {
  game: Game
  onClick: (game: Game) => void
}

export default function GameCard({ game, onClick }: GameCardProps) {
  const gradient = GRADIENT_COLORS[game.category] || 'from-gray-600/40 to-gray-900/60'

  return (
    <button
      onClick={() => onClick(game)}
      className={cn(
        'group relative flex w-full h-full flex-col overflow-hidden rounded-xl',
        'bg-gradient-to-br',
        gradient,
        'border border-white/5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10',
      )}
    >
      {/* Badge */}
      {game.badge && (
        <span
          className={cn(
            'absolute left-2 top-2 z-10 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase',
            BADGE_COLORS[game.badge],
          )}
        >
          {game.badge}
        </span>
      )}

      {/* Token cost */}
      <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md bg-black/40 px-2 py-0.5 text-[10px] text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        {game.tokenCost} gett.
      </span>

      {/* Spacer (where cover image would go) */}
      <div className="flex-1" />

      {/* Bottom info overlay */}
      <div className="relative z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 pt-8">
        <span className="text-[10px] font-medium text-lilla">
          {CATEGORY_LABELS[game.category]}
        </span>
        <h3 className="text-sm font-bold text-white leading-tight">{game.name}</h3>
        <div className="mt-1 flex items-center gap-3 text-[10px] text-muted">
          <span>{game.minPlayers}–{game.maxPlayers} players</span>
          <span>{game.durationMinutes} min</span>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/0 transition-all group-hover:bg-primary/20">
        <div className="flex h-12 w-12 scale-0 items-center justify-center rounded-full bg-primary shadow-lg transition-transform group-hover:scale-100">
          <svg
            className="h-5 w-5 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  )
}
