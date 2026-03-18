import { useState } from 'react'
import { useLicenseStore } from '@/store/licenseStore'

interface LicenseBlockedModalProps {
  onClose: () => void
}

export default function LicenseBlockedModal({ onClose }: LicenseBlockedModalProps) {
  const status = useLicenseStore((s) => s.status)
  const setEmergencyOverride = useLicenseStore((s) => s.setEmergencyOverride)
  const [showPin, setShowPin] = useState(false)
  const [pin, setPin] = useState('')
  const [verifying, setVerifying] = useState(false)

  const isSuspended = status === 'suspended'
  const title = isSuspended ? 'Licenza Sospesa' : 'Licenza Scaduta'
  const message = isSuspended
    ? 'La licenza di questa sede è stata sospesa. Contattare il supporto Virtual Zone per ripristinare l\'accesso.'
    : 'Il periodo di grazia offline è scaduto. Collegare il sistema a internet per rinnovare la licenza, oppure contattare il supporto.'

  const handleOverride = async () => {
    setVerifying(true)
    const ok = await setEmergencyOverride(pin)
    setVerifying(false)
    if (ok) onClose()
    else setPin('')
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10,8,30,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          width: 420,
          padding: '36px 32px',
          background: 'rgba(22,20,45,0.92)',
          border: '1px solid rgba(255,100,100,0.25)',
          borderRadius: 24,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          textAlign: 'center',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'rgba(255,80,80,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ff6b6b', margin: '0 0 8px' }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 24px' }}>
          {message}
        </p>

        {/* Support info */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 20,
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Supporto Virtual Zone</strong>
          <br />
          support@virtualzonevr.it
        </div>

        {/* Emergency override */}
        {!showPin ? (
          <button
            onClick={() => setShowPin(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            Override di emergenza
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !verifying && handleOverride()}
              placeholder="PIN emergenza"
              autoFocus
              disabled={verifying}
              style={{
                width: 140,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: 13,
                fontFamily: 'Outfit, sans-serif',
                textAlign: 'center',
                outline: 'none',
                opacity: verifying ? 0.5 : 1,
              }}
            />
            <button
              onClick={handleOverride}
              disabled={verifying}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 12,
                fontWeight: 600,
                cursor: verifying ? 'wait' : 'pointer',
                fontFamily: 'Outfit, sans-serif',
                opacity: verifying ? 0.5 : 1,
              }}
            >
              {verifying ? '...' : 'Attiva'}
            </button>
          </div>
        )}

        {/* Close — only if not fully blocked (allows dismiss in degraded states) */}
        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            padding: '10px 28px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  )
}
