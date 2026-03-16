import { useMemo } from 'react'
import type { Game } from '@/types/models'
import GameCard from './GameCard'

interface GameGridProps {
  games: Game[]
  onGameClick: (game: Game) => void
}

// Fixed 1920x1080 layout calculations
const PADDING_H = 32
const PADDING_TOP = 10
const GAP = 14

export default function GameGrid({ games, onGameClick }: GameGridProps) {
  const { cols, cardWidth, cardHeight } = useMemo(() => {
    const availW = 1920 - PADDING_H * 2 // 1856
    // Reference: 5 columns for ≤12 filtered, up to 6 for more
    const c = games.length <= 12 ? Math.min(games.length, 5) : Math.min(games.length, 6)
    const cw = (availW - (c - 1) * GAP) / c
    // Vertical poster ratio ~1.35
    const ch = cw * 1.35
    return { cols: c, cardWidth: cw, cardHeight: ch }
  }, [games.length])

  return (
    <div
      style={{
        padding: `${PADDING_TOP}px ${PADDING_H}px 0`,
        position: 'relative',
        zIndex: 5,
        flex: '1 1 0',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cardWidth}px)`,
          gridAutoRows: cardHeight,
          gap: GAP,
          justifyContent: 'center',
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {games.map((game) => (
          <GameCard key={game.id} game={game} onClick={onGameClick} />
        ))}
      </div>
    </div>
  )
}
