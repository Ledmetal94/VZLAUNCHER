import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { getCheckoutSessionStatus } from '@/services/cloudApi'
import { useTokenStore } from '@/store/tokenStore'

export default function CheckoutReturnPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)
  const [tokens, setTokens] = useState<number | null>(null)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!sessionId) return
    getCheckoutSessionStatus(sessionId)
      .then((data) => {
        setStatus(data.status)
        setTokens(data.tokens)
        // Refresh token balance after successful payment
        if (data.status === 'complete') {
          useTokenStore.getState().syncBalance()
        }
      })
      .catch(() => setStatus('error'))
  }, [sessionId])

  // Redirect back to catalog if session is still open
  useEffect(() => {
    if (status === 'open') {
      navigate('/', { replace: true })
    }
  }, [status, navigate])

  return (
    <div
      className="noise-overlay relative flex items-center justify-center overflow-hidden"
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--color-surface)',
        fontFamily: 'Outfit, sans-serif',
        color: '#fff',
      }}
    >
      {/* Ambient blobs */}
      <div className="blob" style={{ width: 700, height: 700, filter: 'blur(160px)', background: 'rgba(82,49,137,0.2)', top: -200, left: -200 }} />
      <div className="blob" style={{ width: 500, height: 500, filter: 'blur(140px)', background: 'rgba(230,0,126,0.1)', bottom: -150, right: -150 }} />
      <div className="blob" style={{ width: 350, height: 350, filter: 'blur(120px)', background: 'rgba(82,49,137,0.1)', top: '40%', right: '20%' }} />

      {/* Loading state */}
      {status === null && (
        <div className="relative z-10" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              border: '3px solid rgba(230,0,126,0.3)',
              borderTopColor: '#E6007E',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 20px',
            }}
          />
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
            Verifica pagamento in corso...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Success state */}
      {status === 'complete' && (
        <div
          className="relative z-10"
          style={{
            textAlign: 'center',
            width: 460,
            padding: '48px 44px',
            background: 'rgba(22,20,45,0.75)',
            border: '1px solid rgba(123,100,169,0.2)',
            borderRadius: 24,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(82,49,137,0.08)',
          }}
        >
          {/* Success icon */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'rgba(68,255,136,0.08)',
              border: '2px solid #44ff88',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#44ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.01em' }}>
            Pagamento completato!
          </div>
          {tokens && (
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 28, lineHeight: 1.5 }}>
              <strong style={{ color: '#E6007E', fontWeight: 700 }}>{tokens.toLocaleString('it-IT')}</strong> gettoni
              saranno accreditati a breve
            </div>
          )}
          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              padding: '12px 40px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #E6007E, #523189)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
              boxShadow: '0 4px 20px rgba(230,0,126,0.3)',
              letterSpacing: '0.02em',
              transition: 'all 0.2s',
            }}
          >
            Torna al catalogo
          </button>
        </div>
      )}

      {/* Error / Expired state */}
      {(status === 'expired' || status === 'error') && (
        <div
          className="relative z-10"
          style={{
            textAlign: 'center',
            width: 460,
            padding: '48px 44px',
            background: 'rgba(22,20,45,0.75)',
            border: '1px solid rgba(123,100,169,0.2)',
            borderRadius: 24,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(82,49,137,0.08)',
          }}
        >
          {/* Error icon */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'rgba(255,68,68,0.08)',
              border: '2px solid #ff4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.01em' }}>
            {status === 'expired' ? 'Sessione scaduta' : 'Errore nel pagamento'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28, lineHeight: 1.5 }}>
            Il pagamento non è andato a buon fine. Riprova.
          </div>
          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              padding: '12px 40px',
              borderRadius: 12,
              border: '1px solid rgba(123,100,169,0.2)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          >
            Torna al catalogo
          </button>
        </div>
      )}
    </div>
  )
}
