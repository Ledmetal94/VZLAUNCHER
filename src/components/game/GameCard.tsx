import { useNavigate } from 'react-router-dom'
import { Play } from '@phosphor-icons/react'
import type { Game } from '../../types'

interface GameCardProps {
  game: Game
}

export function GameCard({ game }: GameCardProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/game/${game.slug}`)}
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_24px_#E5007E55] focus-visible:shadow-[0_0_20px_#E5007E] w-full text-left"
      style={{ aspectRatio: '2/3', background: '#141414' }}
    >
      {/* Poster */}
      <img
        src={game.poster}
        alt={game.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />

      {/* Hover dark overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Magenta glow border on hover */}
      <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-[#E5007E] transition-all duration-300" />

      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
        <div className="w-14 h-14 rounded-full bg-[#E5007E] flex items-center justify-center shadow-[0_0_24px_#E5007E99]">
          <Play size={24} weight="fill" color="white" className="ml-1" />
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-[2px]">
        <img
          src={game.logo}
          alt={`${game.name} logo`}
          className="h-8 object-contain object-left mb-2"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        <p className="text-white font-bold text-base leading-tight">{game.name}</p>
        <p className="text-[#888888] text-xs mt-1">{game.genre} · {game.players}</p>
        <p className="text-[#E5007E] font-semibold text-sm mt-1">€{game.price} / session</p>
      </div>
    </button>
  )
}
