import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Game } from '@/types/models'
import { useConnectionStore } from '@/store/connectionStore'
import { useTokenStore } from '@/store/tokenStore'

interface LaunchModalProps {
  game: Game
  onLaunch: (players: number) => void
  onClose: () => void
  launching: boolean
}

export default function LaunchModal({ game, onLaunch, onClose, launching }: LaunchModalProps) {
  const [players, setPlayers] = useState(game.minPlayers)
  const bridgeStatus = useConnectionStore((s) => s.bridgeStatus)
  const tokenBalance = useTokenStore((s) => s.balance)
  const insufficientTokens = tokenBalance < game.tokenCost
  const bridgeOffline = bridgeStatus === 'offline'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-2xl p-6">
        {/* Header */}
        <div className="mb-6">
          <span className="text-xs font-medium text-lilla uppercase">
            {game.category.replace('_', ' ')}
          </span>
          <h2 className="text-2xl font-bold text-white">{game.name}</h2>
          <p className="mt-1 text-sm text-muted">{game.description}</p>
        </div>

        {/* Game info */}
        <div className="mb-6 flex gap-4 text-sm text-muted">
          <span>{game.durationMinutes} min</span>
          <span>Costo: {game.tokenCost} gettoni</span>
          <span>Saldo: {tokenBalance} gettoni</span>
        </div>

        {/* Insufficient tokens warning */}
        {insufficientTokens && (
          <div className="mb-4 rounded-lg px-4 py-2 text-sm" style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444' }}>
            Gettoni insufficienti — servono {game.tokenCost}, hai {tokenBalance}
          </div>
        )}

        {/* Player count */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-muted">
            Players
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPlayers((p) => Math.max(game.minPlayers, p - 1))}
              disabled={players <= game.minPlayers}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold',
                'bg-surface-light text-white transition hover:bg-surface-lighter',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              −
            </button>
            <span className="min-w-[3ch] text-center text-2xl font-bold text-white">
              {players}
            </span>
            <button
              onClick={() => setPlayers((p) => Math.min(game.maxPlayers, p + 1))}
              disabled={players >= game.maxPlayers}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold',
                'bg-surface-light text-white transition hover:bg-surface-lighter',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              +
            </button>
            <span className="text-xs text-muted">
              ({game.minPlayers}–{game.maxPlayers})
            </span>
          </div>
        </div>

        {/* Bridge offline warning */}
        {bridgeOffline && (
          <div className="mb-4 rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
            Bridge offline — cannot launch games
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-surface-light py-2.5 text-sm font-medium text-muted transition hover:bg-surface-lighter hover:text-white"
          >
            Annulla
          </button>
          <button
            onClick={() => onLaunch(players)}
            disabled={bridgeOffline || launching || insufficientTokens}
            className={cn(
              'flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white',
              'transition hover:bg-primary-hover',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {launching ? 'Avvio...' : 'Avvia sessione'}
          </button>
        </div>
      </div>
    </div>
  )
}
