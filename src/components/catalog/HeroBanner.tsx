import { useNavigate } from 'react-router-dom'
import { GameController, Lightning, Users, BookOpen } from '@phosphor-icons/react'
import type { Game } from '../../types'
import { useConfigStore } from '../../store/configStore'

interface HeroBannerProps {
  game: Game
}

export function HeroBanner({ game }: HeroBannerProps) {
  const navigate = useNavigate()
  const cfg = useConfigStore((s) => s.games[game.slug])
  const price = cfg?.price ?? game.price

  return (
    <div className="relative w-full h-[38vh] min-h-[260px] flex-shrink-0 overflow-hidden">
      {/* Background media */}
      {game.video ? (
        <video
          src={game.video}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster={game.poster}
        />
      ) : (
        <img
          src={game.poster}
          alt={game.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Featured badge */}
      <div className="absolute top-4 left-6">
        <span className="px-3 py-1 bg-[#E5007E] text-white text-xs font-bold uppercase tracking-widest rounded-full">
          Featured
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
        {/* Logo */}
        <img
          src={game.logo}
          alt={`${game.name} logo`}
          className="h-10 object-contain object-left mb-2"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <h2 className="text-3xl font-black text-white leading-tight mb-1">{game.name}</h2>
        <p className="text-[#AAAAAA] text-sm leading-relaxed mb-4 max-w-xl line-clamp-2">
          {game.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-4 mb-5">
          <span className="flex items-center gap-1.5 text-[#888888] text-xs">
            <Users size={13} weight="regular" />
            {game.players}
          </span>
          <span className="flex items-center gap-1.5 text-[#888888] text-xs">
            <Lightning size={13} weight="regular" />
            {cfg?.launcher ?? game.launcher}
          </span>
          <span className="flex items-center gap-1.5 text-[#E5007E] text-xs font-semibold">
            €{price} / session
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/game/${game.slug}`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E5007E] hover:bg-[#C8006E] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            <GameController size={18} weight="fill" />
            Play Now
          </button>
          <button
            onClick={() => navigate(`/tutorial/${game.slug}`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-[#F5F5F5] text-sm font-medium rounded-xl transition-colors cursor-pointer backdrop-blur-sm"
          >
            <BookOpen size={16} weight="regular" />
            Tutorial
          </button>
        </div>
      </div>
    </div>
  )
}
