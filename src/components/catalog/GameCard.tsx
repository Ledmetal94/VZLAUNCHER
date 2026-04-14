import type { Game } from '@/types/models'

const BADGE_COLORS: Record<string, string> = {
  NEW: '#E6007E',
  HOT: '#ff4400',
  TOP: '#523189',
}

const CATEGORY_LABELS: Record<string, string> = {
  arcade_light: 'ARCADE LIGHT',
  arcade_full: 'ARCADE FULL',
  avventura: 'AVVENTURA',
  lasergame: 'LASER GAME',
  escape: 'ESCAPE ROOM',
}

interface GameCardProps {
  game: Game
  onClick: (game: Game) => void
}

export default function GameCard({ game, onClick }: GameCardProps) {
  return (
    <button
      onClick={() => onClick(game)}
      className="
        group relative flex w-full h-full flex-col overflow-hidden
        active:scale-[0.97] active:brightness-110
        hover:scale-[1.03]
        hover:shadow-[0_18px_45px_rgba(0,0,0,0.5),0_0_0_1px_rgba(230,0,126,0.4)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6007E]
      "
      style={{
        background: game.bg,
        borderRadius: 14,
        border: '1px solid rgba(123,100,169,0.18)',
        transition: 'all .22s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(230,0,126,0.5)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(123,100,169,0.18)' }}
    >
      {/* Badge */}
      {game.badge && (
        <span
          className="absolute left-2 top-2 z-10 text-white"
          style={{
            background: BADGE_COLORS[game.badge],
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: '.1em',
            padding: '2px 8px',
            borderRadius: 4,
            textTransform: 'uppercase',
          }}
        >
          {game.badge}
        </span>
      )}

      {/* Token cost */}
      <span
        className="absolute right-2 top-2 z-10 flex items-center gap-1 text-white"
        style={{
          background: 'rgba(10,8,30,0.8)',
          border: '1px solid rgba(123,100,169,0.3)',
          borderRadius: 16,
          padding: '2px 9px',
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        <span
          className="rounded-full"
          style={{ width: 6, height: 6, background: '#E6007E' }}
        />
        {game.tokenCost} gett.
      </span>

      {/* Poster image */}
      {game.thumbnailUrl && (
        <img
          src={game.thumbnailUrl}
          alt={game.name}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom info overlay */}
      <div
        className="relative z-10"
        style={{
          background: 'linear-gradient(to top,rgba(10,8,30,0.97) 0%,rgba(10,8,30,0.65) 50%,transparent 100%)',
          padding: '38px 12px 12px',
        }}
      >
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: '#7B64A9',
          }}
        >
          {CATEGORY_LABELS[game.category]}
        </span>
        <h3
          className="text-white"
          style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.15 }}
        >
          {game.name}
        </h3>
        <div
          className="mt-1 flex items-center gap-3"
          style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)', fontWeight: 500 }}
        >
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {game.minPlayers}-{game.maxPlayers} pl
          </span>
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {game.durationMinutes} min
          </span>
        </div>
      </div>

      {/* Play overlay — visible on hover (desktop) and always on touch active */}
      <div
        className="
          absolute inset-0 z-20 flex items-start justify-center
          opacity-0 transition-opacity
          group-hover:opacity-100 group-active:opacity-100
        "
        style={{
          background: 'linear-gradient(to top,rgba(230,0,126,0.3) 0%,transparent 50%)',
        }}
      >
        <div
          className="
            flex h-12 w-12 items-center justify-center rounded-full bg-[#E6007E] shadow-lg
            scale-0 transition-transform
            group-hover:scale-100 group-active:scale-100
          "
          style={{ marginTop: '36%' }}
        >
          <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  )
}
