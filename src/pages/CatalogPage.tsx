import { useState, useMemo, useEffect, useCallback } from 'react'
import Header from '@/components/catalog/Header'
import CategoryFilters from '@/components/catalog/CategoryFilters'
import GameGrid from '@/components/catalog/GameGrid'
import LaunchModal from '@/components/catalog/LaunchModal'
import SessionBar from '@/components/catalog/SessionBar'
import SettingsModal from '@/components/catalog/SettingsModal'
import { checkBridgeHealth, launchGame, stopSession } from '@/services/bridgeApi'
import { useSessionStore } from '@/store/sessionStore'
import { useConnectionStore } from '@/store/connectionStore'
import { useGameStore } from '@/store/gameStore'
import type { Category, Game } from '@/types/models'

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [launching, setLaunching] = useState(false)
  const [ending, setEnding] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const activeSession = useSessionStore((s) => s.activeSession)
  const startSession = useSessionStore((s) => s.startSession)
  const endSession = useSessionStore((s) => s.endSession)
  const setBridgeStatus = useConnectionStore((s) => s.setBridgeStatus)

  const games = useGameStore((s) => s.games)
  const fetchGames = useGameStore((s) => s.fetchGames)

  // Fetch games from API on mount
  useEffect(() => {
    fetchGames()
  }, [fetchGames])

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
    if (selectedCategory === 'all') return games
    return games.filter((g) => g.category === selectedCategory)
  }, [selectedCategory, games])

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
    <div className="noise-overlay relative flex flex-col overflow-hidden" style={{ width: 1920, height: 1080, background: 'var(--color-surface)' }}>
      {/* Ambient blobs */}
      <div className="blob" style={{ width: 800, height: 800, filter: 'blur(160px)', background: 'rgba(82,49,137,0.18)', top: -300, left: -300 }} />
      <div className="blob" style={{ width: 600, height: 600, filter: 'blur(150px)', background: 'rgba(230,0,126,0.08)', bottom: -250, right: -200 }} />
      <div className="blob" style={{ width: 450, height: 450, filter: 'blur(130px)', background: 'rgba(82,49,137,0.08)', top: '30%', left: '50%' }} />

      {/* All content above blobs */}
      <div className="relative z-10 flex flex-1 flex-col min-h-0">
        <Header onSettingsClick={() => setSettingsOpen(true)} />
        <CategoryFilters
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          gameCount={filteredGames.length}
        />
        <GameGrid games={filteredGames} onGameClick={setSelectedGame} />

        {activeSession && (
          <SessionBar onEnd={handleEnd} ending={ending} />
        )}

        {settingsOpen && (
          <SettingsModal onClose={() => setSettingsOpen(false)} />
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
    </div>
  )
}
