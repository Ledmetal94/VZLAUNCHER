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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
        className="relative z-10"
        style={{
          width: 440,
          padding: '32px 36px',
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
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7B64A9' }}>
            {game.category.replace('_', ' ')}
          </span>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '4px 0 0', letterSpacing: '-0.01em' }}>
            {game.name}
          </h2>
          {game.description && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 1.4 }}>{game.description}</p>
          )}
        </div>

        {/* Game info pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            `${game.durationMinutes} min`,
            `Costo: ${game.tokenCost} gettoni`,
            `Saldo: ${tokenBalance} gettoni`,
          ].map((label) => (
            <span key={label} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: 'rgba(82,49,137,0.1)', border: '1px solid rgba(123,100,169,0.15)', color: 'rgba(255,255,255,0.5)' }}>
              {label}
            </span>
          ))}
        </div>

        {/* Insufficient tokens warning */}
        {insufficientTokens && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', color: '#ff6b6b', fontSize: 12, fontWeight: 600 }}>
            Gettoni insufficienti — servono {game.tokenCost}, hai {tokenBalance}
          </div>
        )}

        {/* Player count */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10, letterSpacing: '0.04em' }}>
            Giocatori
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setPlayers((p) => Math.max(game.minPlayers, p - 1))}
              disabled={players <= game.minPlayers}
              style={{ width: 42, height: 42, borderRadius: 10, border: '1px solid rgba(123,100,169,0.2)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 20, fontWeight: 700, cursor: players <= game.minPlayers ? 'not-allowed' : 'pointer', opacity: players <= game.minPlayers ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', fontFamily: 'Outfit, sans-serif' }}
            >
              −
            </button>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, rgba(230,0,126,0.15), rgba(82,49,137,0.15))', border: '1px solid rgba(230,0,126,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff' }}>
              {players}
            </div>
            <button
              onClick={() => setPlayers((p) => Math.min(game.maxPlayers, p + 1))}
              disabled={players >= game.maxPlayers}
              style={{ width: 42, height: 42, borderRadius: 10, border: '1px solid rgba(123,100,169,0.2)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 20, fontWeight: 700, cursor: players >= game.maxPlayers ? 'not-allowed' : 'pointer', opacity: players >= game.maxPlayers ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', fontFamily: 'Outfit, sans-serif' }}
            >
              +
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              ({game.minPlayers}–{game.maxPlayers})
            </span>
          </div>
        </div>

        {/* Bridge offline warning */}
        {bridgeOffline && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
            Bridge offline — impossibile avviare i giochi
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid rgba(123,100,169,0.2)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            Annulla
          </button>
          <button
            onClick={() => onLaunch(players)}
            disabled={bridgeOffline || launching || insufficientTokens}
            style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #E6007E, #523189)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: (bridgeOffline || launching || insufficientTokens) ? 'not-allowed' : 'pointer', opacity: (bridgeOffline || launching || insufficientTokens) ? 0.5 : 1, fontFamily: 'Outfit, sans-serif', boxShadow: '0 4px 20px rgba(230,0,126,0.3)', transition: 'all 0.2s', letterSpacing: '0.02em' }}
          >
            {launching ? 'Avvio...' : 'Avvia sessione'}
          </button>
        </div>
      </div>
    </div>
  )
}
