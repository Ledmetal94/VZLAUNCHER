import type { Game } from '@/types/models'
import GameCard from './GameCard'

interface GameGridProps {
  games: Game[]
  onGameClick: (game: Game) => void
}

export default function GameGrid({ games, onGameClick }: GameGridProps) {
  return (
    <div className="flex-1 min-h-0 px-6 pb-4">
      <div className="grid h-full grid-cols-6 grid-rows-2 gap-3">
        {games.slice(0, 12).map((game) => (
          <GameCard key={game.id} game={game} onClick={onGameClick} />
        ))}
      </div>
    </div>
  )
}
