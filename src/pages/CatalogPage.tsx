import { useState, useMemo, useEffect, useCallback } from 'react'
import Header from '@/components/catalog/Header'
import CategoryFilters from '@/components/catalog/CategoryFilters'
import GameGrid from '@/components/catalog/GameGrid'
import LaunchModal from '@/components/catalog/LaunchModal'
import SessionBar from '@/components/catalog/SessionBar'
import { SAMPLE_GAMES } from '@/data/games'
import { checkBridgeHealth, launchGame, stopSession } from '@/services/bridgeApi'
import { useSessionStore } from '@/store/sessionStore'
import { useConnectionStore } from '@/store/connectionStore'
import type { Category, Game } from '@/types/models'

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [launching, setLaunching] = useState(false)
  const [ending, setEnding] = useState(false)

  const activeSession = useSessionStore((s) => s.activeSession)
  const startSession = useSessionStore((s) => s.startSession)
  const endSession = useSessionStore((s) => s.endSession)
  const setBridgeStatus = useConnectionStore((s) => s.setBridgeStatus)

  // Poll bridge health
  useEffect(() => {
    let active = true
    async function poll() {
      const online = await checkBridgeHealth()
      if (active) setBridgeStatus(online ? 'online' : 'offline')
    }
    poll()
    const interval = setInterval(poll, 10000)
    return () => { active = false; clearInterval(interval) }
  }, [setBridgeStatus])

  const filteredGames = useMemo(() => {
    if (selectedCategory === 'all') return SAMPLE_GAMES
    return SAMPLE_GAMES.filter((g) => g.category === selectedCategory)
  }, [selectedCategory])

  const handleLaunch = useCallback(async (players: number) => {
    if (!selectedGame) return
    setLaunching(true)
    try {
      const result = await launchGame(selectedGame.id, players)
      if (result.success && result.session) {
        startSession(selectedGame, players, result.session.id)
        setSelectedGame(null)
      }
    } catch (err) {
      console.error('Launch failed:', err)
    } finally {
      setLaunching(false)
    }
  }, [selectedGame, startSession])

  const handleEnd = useCallback(async () => {
    setEnding(true)
    try {
      await stopSession()
      endSession()
    } catch (err) {
      console.error('Stop failed:', err)
    } finally {
      setEnding(false)
    }
  }, [endSession])

  return (
    <div className="flex h-screen flex-col bg-surface">
      <Header />
      <CategoryFilters
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        gameCount={filteredGames.length}
      />
      <GameGrid games={filteredGames} onGameClick={setSelectedGame} />

      {activeSession && (
        <SessionBar onEnd={handleEnd} ending={ending} />
      )}

      {selectedGame && !activeSession && (
        <LaunchModal
          game={selectedGame}
          onLaunch={handleLaunch}
          onClose={() => setSelectedGame(null)}
          launching={launching}
        />
      )}
    </div>
  )
}
