import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLicenseStore } from '@/store/licenseStore'
import { usePwa } from '@/hooks/usePwa'

interface HeaderProps {
  onSettingsClick?: () => void
  onTokenClick?: () => void
  tokenBalance?: number
}

export default function Header({ onSettingsClick, onTokenClick, tokenBalance = 0 }: HeaderProps) {
  const role = useAuthStore((s) => s.role)
  const isAdmin = role === 'admin'
  const { canInstall, promptInstall } = usePwa()
  const licenseStatus = useLicenseStore((s) => s.status)
  const getOfflineRemaining = useLicenseStore((s) => s.getOfflineTimeRemaining)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = time.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <header
      className="relative z-50 flex shrink-0 items-center justify-between"
      style={{
        height: 56,
        padding: '0 32px',
        borderBottom: '1px solid rgba(123,100,169,0.12)',
        background: 'rgba(15,14,31,0.75)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="VZ" className="h-8" />

        {/* Token widget pill */}
        <div
          role={isAdmin ? 'button' : undefined}
          onClick={isAdmin ? onTokenClick : undefined}
          style={{
            background: 'rgba(230,0,126,0.08)',
            border: '1px solid rgba(230,0,126,0.3)',
            borderRadius: 9999,
            padding: '6px 8px 6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: isAdmin ? 'pointer' : 'default',
            transition: 'all 0.2s',
            userSelect: 'none',
          }}
          onMouseEnter={isAdmin ? (e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(230,0,126,0.16)'
            el.style.borderColor = '#E6007E'
            el.style.boxShadow = '0 0 20px rgba(230,0,126,0.2)'
          } : undefined}
          onMouseLeave={isAdmin ? (e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(230,0,126,0.08)'
            el.style.borderColor = 'rgba(230,0,126,0.3)'
            el.style.boxShadow = 'none'
          } : undefined}
        >
          {/* Circle "G" icon */}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#E6007E,#523189)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 900,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            G
          </div>

          {/* Stacked info */}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              GETTONI
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-0.01em',
              }}
            >
              {tokenBalance.toLocaleString('it-IT')}
            </span>
          </div>

          {/* Plus button (admin only) */}
          {isAdmin && (
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#E6007E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                color: '#fff',
                marginLeft: 2,
              }}
            >
              +
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* License pill */}
        {(() => {
          const isOnline = licenseStatus === 'active' || licenseStatus === 'unknown'
          const isDegraded = licenseStatus === 'expired' || licenseStatus === 'suspended'
          const color = isDegraded ? '#ff4444' : isOnline ? '#44ff88' : '#ffaa00'
          const remaining = getOfflineRemaining()
          const hoursLeft = Math.floor(remaining / (60 * 60 * 1000))
          const label = isDegraded
            ? 'Offline scaduto'
            : licenseStatus === 'active'
              ? 'Online'
              : licenseStatus === 'unknown'
                ? 'Online'
                : remaining > 0
                  ? `Offline ${hoursLeft}h`
                  : 'Offline'
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: `${color}14`,
                border: `1px solid ${color}38`,
                borderRadius: 16,
                padding: '4px 12px',
                fontSize: 10,
                fontWeight: 700,
                color,
                letterSpacing: '0.06em',
              }}
            >
              <span
                className={isOnline ? 'animate-pulse' : undefined}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: color,
                  display: 'inline-block',
                }}
              />
              {label}
            </div>
          )
        })()}

        {/* Games admin button (admin only) */}
        {isAdmin && (
          <button
            onClick={() => window.location.href = '/admin/games'}
            style={{
              height: 36,
              borderRadius: 8,
              border: '1px solid rgba(123,100,169,0.18)',
              background: 'rgba(255,255,255,0.025)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '0 14px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M12 12h.01M8 12h.01M16 12h.01" />
            </svg>
            Giochi
          </button>
        )}

        {/* Analytics button (admin only) */}
        {isAdmin && (
          <button
            onClick={() => window.location.href = '/analytics'}
            style={{
              height: 36,
              borderRadius: 8,
              border: '1px solid rgba(230,0,126,0.25)',
              background: 'rgba(230,0,126,0.06)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '0 14px',
              color: '#E6007E',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            Analisi
          </button>
        )}

        {/* History button */}
        <button
          onClick={() => window.location.href = '/history'}
          style={{
            height: 36,
            borderRadius: 8,
            border: '1px solid rgba(123,100,169,0.18)',
            background: 'rgba(255,255,255,0.025)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '0 14px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Storico
        </button>

        {/* Install PWA button */}
        {canInstall && (
          <button
            onClick={() => promptInstall().catch(() => {})}
            aria-label="Installa app"
            style={{
              height: 36,
              borderRadius: 8,
              border: '1px solid rgba(68,255,136,0.22)',
              background: 'rgba(68,255,136,0.06)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '0 14px',
              color: '#44ff88',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Installa
          </button>
        )}

        {/* Clock */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.28)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.06em',
          }}
        >
          {timeStr}
        </span>

        {/* Settings gear button (admin only) */}
        {isAdmin && (
          <button
            onClick={onSettingsClick}
            aria-label="Impostazioni"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid rgba(123,100,169,0.18)',
              background: 'rgba(255,255,255,0.025)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}
