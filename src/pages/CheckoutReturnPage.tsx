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
      className="flex items-center justify-center"
      style={{
        height: '100vh',
        background: '#0D0C1A',
        fontFamily: 'Outfit, sans-serif',
        color: '#fff',
      }}
    >
      {status === null && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 40, height: 40, border: '3px solid rgba(230,0,126,0.3)',
              borderTopColor: '#E6007E', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            Verifica pagamento in corso...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {status === 'complete' && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 64px',
            background: 'rgba(22,20,45,0.98)',
            border: '1px solid rgba(123,100,169,0.25)',
            borderRadius: 20,
            boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          }}
        >
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(0,200,100,0.1)', border: '2px solid #00d46a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00d46a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            Pagamento completato!
          </div>
          {tokens && (
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
              <strong style={{ color: '#E6007E' }}>{tokens.toLocaleString('it-IT')}</strong> gettoni
              saranno accreditati a breve
            </div>
          )}
          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              padding: '12px 36px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #E6007E, #523189)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
              boxShadow: '0 6px 24px rgba(230,0,126,0.3)',
            }}
          >
            Torna al catalogo
          </button>
        </div>
      )}

      {(status === 'expired' || status === 'error') && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 64px',
            background: 'rgba(22,20,45,0.98)',
            border: '1px solid rgba(123,100,169,0.25)',
            borderRadius: 20,
            boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          }}
        >
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,80,80,0.1)', border: '2px solid #ff5050',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff5050" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            {status === 'expired' ? 'Sessione scaduta' : 'Errore nel pagamento'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
            Il pagamento non è andato a buon fine. Riprova.
          </div>
          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              padding: '12px 36px', borderRadius: 10, border: 'none',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            Torna al catalogo
          </button>
        </div>
      )}
    </div>
  )
}
