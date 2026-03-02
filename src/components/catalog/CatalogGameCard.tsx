import { useNavigate } from 'react-router-dom'
import { GameController, Users } from '@phosphor-icons/react'
import type { Game } from '../../types'
import { useConfigStore } from '../../store/configStore'

interface CatalogGameCardProps {
  game: Game
  isNew?: boolean
}

export function CatalogGameCard({ game, isNew }: CatalogGameCardProps) {
  const navigate = useNavigate()
  const cfg = useConfigStore((s) => s.games[game.slug])
  const price = cfg?.price ?? game.price

  return (
    <button
      onClick={() => navigate(`/game/${game.slug}`)}
      className="group relative w-full h-full rounded-2xl overflow-hidden bg-[#141414] border border-white/[0.06] hover:border-[#E5007E]/60 transition-all duration-200 cursor-pointer hover:scale-[1.02] focus:outline-none"
    >
      {/* Poster */}
      <img
        src={game.poster}
        alt={game.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Overlay gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

      {/* Hover play overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-14 h-14 rounded-full bg-[#E5007E]/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-[#E5007E]/30">
          <GameController size={26} weight="fill" color="white" />
        </div>
      </div>

      {/* NEW badge */}
      {isNew && (
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2 py-0.5 bg-[#E5007E] text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
            New
          </span>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {/* Game logo */}
        <img
          src={game.logo}
          alt={`${game.name} logo`}
          className="h-6 object-contain object-left mb-1.5"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <p className="text-[#F5F5F5] text-xs font-bold leading-tight truncate">{game.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="flex items-center gap-1 text-[#888888] text-[10px]">
            <Users size={10} weight="regular" />
            {game.players}
          </span>
          <span className="text-[#E5007E] text-[10px] font-semibold">€{price}</span>
        </div>
      </div>
    </button>
  )
}
