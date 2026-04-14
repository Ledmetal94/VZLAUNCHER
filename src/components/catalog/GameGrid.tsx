import type { Game } from '@/types/models'
import GameCard from './GameCard'

interface GameGridProps {
  games: Game[]
  onGameClick: (game: Game) => void
}

export default function GameGrid({ games, onGameClick }: GameGridProps) {
  return (
    <div className="relative z-[5] flex-1 min-h-0 px-6 xl:px-8 pt-2.5 overflow-y-auto xl:overflow-hidden">
      <div
        className="
          grid gap-3 xl:gap-[14px]
          grid-cols-3
          md:grid-cols-4
          xl:grid-cols-6
          xl:h-full xl:grid-rows-2
          justify-center
        "
      >
        {games.map((game) => (
          <div key={game.id} className="aspect-[1/1.35] xl:aspect-auto">
            <GameCard game={game} onClick={onGameClick} />
          </div>
        ))}
      </div>
    </div>
  )
}
