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

  const timeStr = time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return (
    <header
      className="relative z-50 flex shrink-0 items-center justify-between px-6 xl:px-8"
      style={{
        height: 56,
        borderBottom: '1px solid rgba(123,100,169,0.12)',
        background: 'rgba(15,14,31,0.75)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3 xl:gap-4">
        <img src="/logo.png" alt="VZ" className="h-7 xl:h-8" />

        {/* Token widget pill */}
        <div
          role={isAdmin ? 'button' : undefined}
          onClick={isAdmin ? onTokenClick : undefined}
          className={`
            flex items-center gap-2 xl:gap-[10px] select-none transition-all duration-200
            ${isAdmin ? 'cursor-pointer hover:shadow-[0_0_20px_rgba(230,0,126,0.2)] hover:border-[#E6007E] active:scale-95' : 'cursor-default'}
            min-h-[44px] px-2 xl:px-[10px]
          `}
          style={{
            background: 'rgba(230,0,126,0.08)',
            border: '1px solid rgba(230,0,126,0.3)',
            borderRadius: 9999,
          }}
        >
          {/* Circle "G" icon */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#E6007E,#523189)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 900,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            G
          </div>

          {/* Stacked info */}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              GETTONI
            </span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
              {tokenBalance.toLocaleString('it-IT')}
            </span>
          </div>

          {isAdmin && (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#E6007E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
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
      <div className="flex items-center gap-2 xl:gap-3">
        {/* License pill */}
        {(() => {
          const isOnline = licenseStatus === 'active' || licenseStatus === 'unknown'
          const isDegraded = licenseStatus === 'expired' || licenseStatus === 'suspended'
          const color = isDegraded ? '#ff4444' : isOnline ? '#44ff88' : '#ffaa00'
          const remaining = getOfflineRemaining()
          const hoursLeft = Math.floor(remaining / (60 * 60 * 1000))
          const label = isDegraded
            ? 'Offline scaduto'
            : licenseStatus === 'active' || licenseStatus === 'unknown'
              ? 'Online'
              : remaining > 0
                ? `Offline ${hoursLeft}h`
                : 'Offline'
          return (
            <div
              className="flex items-center gap-1.5"
              style={{
                background: `${color}14`,
                border: `1px solid ${color}38`,
                borderRadius: 16,
                padding: '4px 10px',
                fontSize: 10,
                fontWeight: 700,
                color,
                letterSpacing: '0.06em',
              }}
            >
              <span
                className={isOnline ? 'animate-pulse' : undefined}
                style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }}
              />
              {label}
            </div>
          )
        })()}

        {/* Games admin button (admin only) */}
        {isAdmin && (
          <button
            onClick={() => window.location.href = '/admin/games'}
            className="min-h-[44px] flex items-center gap-1.5 px-3 xl:px-3.5 rounded-lg transition-colors hover:bg-white/[0.06] active:scale-95"
            style={{
              border: '1px solid rgba(123,100,169,0.18)',
              background: 'rgba(255,255,255,0.025)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M12 12h.01M8 12h.01M16 12h.01" />
            </svg>
            <span className="hidden sm:inline">Giochi</span>
          </button>
        )}

        {/* Analytics button (admin only) */}
        {isAdmin && (
          <button
            onClick={() => window.location.href = '/analytics'}
            className="min-h-[44px] flex items-center gap-1.5 px-3 xl:px-3.5 rounded-lg transition-colors hover:bg-[rgba(230,0,126,0.12)] active:scale-95"
            style={{
              border: '1px solid rgba(230,0,126,0.25)',
              background: 'rgba(230,0,126,0.06)',
              color: '#E6007E',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            <span className="hidden sm:inline">Analisi</span>
          </button>
        )}

        {/* History button */}
        <button
          onClick={() => window.location.href = '/history'}
          className="min-h-[44px] flex items-center gap-1.5 px-3 xl:px-3.5 rounded-lg transition-colors hover:bg-white/[0.06] active:scale-95"
          style={{
            border: '1px solid rgba(123,100,169,0.18)',
            background: 'rgba(255,255,255,0.025)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="hidden sm:inline">Storico</span>
        </button>

        {/* Install PWA button */}
        {canInstall && (
          <button
            onClick={() => promptInstall().catch(() => {})}
            aria-label="Installa app"
            className="min-h-[44px] flex items-center gap-1.5 px-3 rounded-lg transition-colors hover:bg-[rgba(68,255,136,0.12)] active:scale-95"
            style={{
              border: '1px solid rgba(68,255,136,0.22)',
              background: 'rgba(68,255,136,0.06)',
              color: '#44ff88',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span className="hidden sm:inline">Installa</span>
          </button>
        )}

        {/* Clock */}
        <span
          className="hidden sm:block tabular-nums"
          style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em' }}
        >
          {timeStr}
        </span>

        {/* Settings gear button (admin only) */}
        {isAdmin && (
          <button
            onClick={onSettingsClick}
            aria-label="Impostazioni"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06] active:scale-95"
            style={{
              border: '1px solid rgba(123,100,169,0.18)',
              background: 'rgba(255,255,255,0.025)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}
