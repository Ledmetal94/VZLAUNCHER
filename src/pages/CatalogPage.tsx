import { useState, useMemo } from 'react'
import Header from '@/components/catalog/Header'
import CategoryFilters from '@/components/catalog/CategoryFilters'
import GameGrid from '@/components/catalog/GameGrid'
import { SAMPLE_GAMES } from '@/data/games'
import type { Category, Game } from '@/types/models'

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [_selectedGame, setSelectedGame] = useState<Game | null>(null)

  const filteredGames = useMemo(() => {
    if (selectedCategory === 'all') return SAMPLE_GAMES
    return SAMPLE_GAMES.filter((g) => g.category === selectedCategory)
  }, [selectedCategory])

  function handleGameClick(game: Game) {
    setSelectedGame(game)
    // Launch modal will be added in VZLAUNCHER-11
  }

  return (
    <div className="flex h-screen flex-col bg-surface">
      <Header />
      <CategoryFilters
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        gameCount={filteredGames.length}
      />
      <GameGrid games={filteredGames} onGameClick={handleGameClick} />
    </div>
  )
}
