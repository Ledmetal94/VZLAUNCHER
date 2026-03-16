import type { Game } from '@/types/models'
import GameCard from './GameCard'

interface GameGridProps {
  games: Game[]
  onGameClick: (game: Game) => void
}

export default function GameGrid({ games, onGameClick }: GameGridProps) {
  // Dynamic columns: 5 for ≤12 games, 6 for >12
  const cols = games.length <= 12 ? Math.min(games.length, 5) : 6

  return (
    <div className="relative z-5 flex-1 min-h-0 overflow-hidden" style={{ padding: '10px 32px' }}>
      <div
        className="h-full"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridAutoRows: '1fr',
          gap: 14,
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {games.map((game) => (
          <GameCard key={game.id} game={game} onClick={onGameClick} />
        ))}
      </div>
    </div>
  )
}
