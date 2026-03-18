import { useState, useMemo, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import Header from '@/components/catalog/Header'
import CategoryFilters from '@/components/catalog/CategoryFilters'
import GameGrid from '@/components/catalog/GameGrid'
import LaunchModal from '@/components/catalog/LaunchModal'
import LicenseBlockedModal from '@/components/catalog/LicenseBlockedModal'
import SessionBar from '@/components/catalog/SessionBar'
import SettingsModal from '@/components/catalog/SettingsModal'
import TokenModal from '@/components/catalog/TokenModal'
import { launchGame, stopSession } from '@/services/bridgeApi'
import { useSessionStore } from '@/store/sessionStore'
import { useGameStore } from '@/store/gameStore'
import { useTokenStore } from '@/store/tokenStore'
import { useAuthStore } from '@/store/authStore'
import { useLicenseStore } from '@/store/licenseStore'
import type { Category, Game } from '@/types/models'

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [launching, setLaunching] = useState(false)
  const [ending, setEnding] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tokenModalOpen, setTokenModalOpen] = useState(false)
  const [licenseModalOpen, setLicenseModalOpen] = useState(false)
  const isAdmin = useAuthStore((s) => s.role) === 'admin'

  const activeSession = useSessionStore((s) => s.activeSession)
  const startSession = useSessionStore((s) => s.startSession)
  const endSession = useSessionStore((s) => s.endSession)
  const licenseStatus = useLicenseStore((s) => s.status)
  const isLicenseBlocked = licenseStatus === 'expired' || licenseStatus === 'suspended'

  const games = useGameStore((s) => s.games)
  const fetchGames = useGameStore((s) => s.fetchGames)
  const startAutoRefresh = useGameStore((s) => s.startAutoRefresh)
  const stopAutoRefresh = useGameStore((s) => s.stopAutoRefresh)
  const tokenBalance = useTokenStore((s) => s.balance)
  const syncBalance = useTokenStore((s) => s.syncBalance)
  const consumeLocal = useTokenStore((s) => s.consumeLocal)
  const refundLocal = useTokenStore((s) => s.refundLocal)

  // Fetch games + token balance on mount, start auto-refresh
  useEffect(() => {
    fetchGames()
    syncBalance()
    startAutoRefresh()
    return () => stopAutoRefresh()
  }, [fetchGames, syncBalance, startAutoRefresh, stopAutoRefresh])


  const filteredGames = useMemo(() => {
    if (selectedCategory === 'all') return games
    return games.filter((g) => g.category === selectedCategory)
  }, [selectedCategory, games])

  // Intercept game card click — block if license invalid
  const handleGameClick = useCallback((game: Game) => {
    if (isLicenseBlocked) {
      setLicenseModalOpen(true)
      return
    }
    setSelectedGame(game)
  }, [isLicenseBlocked])

  const handleLaunch = useCallback(async (players: number) => {
    if (!selectedGame) return

    // Double-check license before launch
    if (isLicenseBlocked) {
      setLicenseModalOpen(true)
      return
    }

    // Check and consume tokens locally first
    const consumed = consumeLocal(selectedGame.tokenCost, selectedGame.id)
    if (!consumed) {
      toast.warning('Gettoni insufficienti!')
      return
    }

    setLaunching(true)
    try {
      const result = await launchGame(selectedGame.id, players)
      if (result.success && result.session) {
        startSession(selectedGame, players, result.session.id)
        setSelectedGame(null)
      } else {
        // Bridge returned failure — refund tokens
        refundLocal(selectedGame.tokenCost, selectedGame.id)
        toast.error('Avvio gioco fallito — gettoni rimborsati')
      }
    } catch (err) {
      // Network/bridge error — refund tokens
      refundLocal(selectedGame.tokenCost, selectedGame.id)
      toast.error('Avvio gioco fallito — gettoni rimborsati')
    } finally {
      setLaunching(false)
    }
  }, [selectedGame, startSession, consumeLocal, refundLocal, isLicenseBlocked])

  const handleEnd = useCallback(async () => {
    setEnding(true)
    try {
      await stopSession()
      await endSession()
    } catch (err) {
      toast.error('Errore arresto sessione')
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
        <Header
          onSettingsClick={isAdmin ? () => setSettingsOpen(true) : undefined}
          onTokenClick={isAdmin ? () => setTokenModalOpen(true) : undefined}
          tokenBalance={tokenBalance}
        />
        <CategoryFilters
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          gameCount={filteredGames.length}
        />
        <GameGrid games={filteredGames} onGameClick={handleGameClick} />

        {activeSession && (
          <SessionBar onEnd={handleEnd} ending={ending} />
        )}

        {isAdmin && settingsOpen && (
          <SettingsModal onClose={() => setSettingsOpen(false)} />
        )}

        {isAdmin && tokenModalOpen && (
          <TokenModal balance={tokenBalance} onClose={() => setTokenModalOpen(false)} />
        )}

        {licenseModalOpen && (
          <LicenseBlockedModal onClose={() => setLicenseModalOpen(false)} />
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
