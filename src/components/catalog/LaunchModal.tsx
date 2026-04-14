import { useState } from 'react'
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(10,8,30,0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Ambient blobs */}
      <div className="blob" style={{ width: 400, height: 400, filter: 'blur(120px)', background: 'rgba(82,49,137,0.15)', top: '20%', left: '30%' }} />
      <div className="blob" style={{ width: 300, height: 300, filter: 'blur(100px)', background: 'rgba(230,0,126,0.08)', bottom: '20%', right: '30%' }} />

      {/* Modal card */}
      <div
        className="relative z-10 w-[92vw] max-w-md xl:max-w-[440px]"
        style={{
          padding: '28px 28px 24px',
          background: 'rgba(22,20,45,0.85)',
          border: '1px solid rgba(123,100,169,0.2)',
          borderRadius: 24,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 80px rgba(82,49,137,0.08)',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        {/* Header */}
        <div className="mb-4 xl:mb-5">
          <span className="block text-[10px] font-bold tracking-[0.12em] uppercase text-[#7B64A9]">
            {game.category.replace('_', ' ')}
          </span>
          <h2 className="mt-1 text-2xl xl:text-3xl font-extrabold text-white tracking-tight">
            {game.name}
          </h2>
          {game.description && (
            <p className="mt-1.5 text-sm text-white/40 leading-snug">{game.description}</p>
          )}
        </div>

        {/* Game info pills */}
        <div className="flex flex-wrap gap-2 mb-4 xl:mb-5">
          {[
            `${game.durationMinutes} min`,
            `Costo: ${game.tokenCost} gettoni`,
            `Saldo: ${tokenBalance} gettoni`,
          ].map((label) => (
            <span
              key={label}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white/50"
              style={{
                background: 'rgba(82,49,137,0.1)',
                border: '1px solid rgba(123,100,169,0.15)',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Insufficient tokens warning */}
        {insufficientTokens && (
          <div
            className="mb-4 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#ff6b6b]"
            style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)' }}
          >
            Gettoni insufficienti — servono {game.tokenCost}, hai {tokenBalance}
          </div>
        )}

        {/* Player count */}
        <div className="mb-6 xl:mb-7">
          <label className="block text-[11px] font-semibold text-white/40 mb-3 tracking-[0.04em]">
            Giocatori
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPlayers((p) => Math.max(game.minPlayers, p - 1))}
              disabled={players <= game.minPlayers}
              className="
                w-12 h-12 xl:w-14 xl:h-14 rounded-xl flex items-center justify-center
                text-xl font-bold text-white transition-all duration-150
                hover:bg-white/10 active:scale-95
                disabled:opacity-30 disabled:cursor-not-allowed
              "
              style={{ border: '1px solid rgba(123,100,169,0.2)', background: 'rgba(255,255,255,0.04)' }}
            >
              −
            </button>

            <div
              className="w-14 h-14 xl:w-16 xl:h-16 rounded-2xl flex items-center justify-center text-3xl xl:text-4xl font-black text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(230,0,126,0.15), rgba(82,49,137,0.15))',
                border: '1px solid rgba(230,0,126,0.3)',
              }}
            >
              {players}
            </div>

            <button
              onClick={() => setPlayers((p) => Math.min(game.maxPlayers, p + 1))}
              disabled={players >= game.maxPlayers}
              className="
                w-12 h-12 xl:w-14 xl:h-14 rounded-xl flex items-center justify-center
                text-xl font-bold text-white transition-all duration-150
                hover:bg-white/10 active:scale-95
                disabled:opacity-30 disabled:cursor-not-allowed
              "
              style={{ border: '1px solid rgba(123,100,169,0.2)', background: 'rgba(255,255,255,0.04)' }}
            >
              +
            </button>

            <span className="text-xs text-white/30">
              ({game.minPlayers}–{game.maxPlayers})
            </span>
          </div>
        </div>

        {/* Bridge offline warning */}
        {bridgeOffline && (
          <div
            className="mb-4 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#f59e0b]"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            Bridge offline — impossibile avviare i giochi
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="
              flex-1 min-h-[52px] xl:min-h-[56px] rounded-xl text-sm xl:text-base font-semibold text-white/50
              transition-all duration-150 hover:bg-white/[0.08] hover:text-white active:scale-[0.98]
            "
            style={{
              border: '1px solid rgba(123,100,169,0.2)',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            Annulla
          </button>
          <button
            onClick={() => onLaunch(players)}
            disabled={bridgeOffline || launching || insufficientTokens}
            className="
              flex-1 min-h-[52px] xl:min-h-[56px] rounded-xl text-sm xl:text-base font-bold text-white
              transition-all duration-200 active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            style={{
              border: 'none',
              background: 'linear-gradient(135deg, #E6007E, #523189)',
              boxShadow: '0 4px 20px rgba(230,0,126,0.3)',
              letterSpacing: '0.02em',
            }}
          >
            {launching ? 'Avvio...' : 'Avvia sessione'}
          </button>
        </div>
      </div>
    </div>
  )
}
