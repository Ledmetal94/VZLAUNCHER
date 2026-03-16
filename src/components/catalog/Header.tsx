import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function Header() {
  const [time, setTime] = useState(new Date())
  const logout = useAuthStore((s) => s.logout)

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
        <button
          className="group"
          style={{
            background: 'rgba(230,0,126,0.08)',
            border: '1px solid rgba(230,0,126,0.3)',
            borderRadius: 9999,
            padding: '6px 8px 6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'all 0.2s',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(230,0,126,0.16)'
            el.style.borderColor = '#E6007E'
            el.style.boxShadow = '0 0 20px rgba(230,0,126,0.2)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(230,0,126,0.08)'
            el.style.borderColor = 'rgba(230,0,126,0.3)'
            el.style.boxShadow = 'none'
          }}
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
              1.247
            </span>
          </div>

          {/* Plus button */}
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
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* License pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(68,255,136,0.08)',
            border: '1px solid rgba(68,255,136,0.22)',
            borderRadius: 16,
            padding: '4px 12px',
            fontSize: 10,
            fontWeight: 700,
            color: '#44ff88',
            letterSpacing: '0.06em',
          }}
        >
          <span
            className="animate-pulse"
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#44ff88',
              display: 'inline-block',
            }}
          />
          Online
        </div>

        {/* QR button */}
        <button
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
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          QR
        </button>

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

        {/* Settings gear button */}
        <button
          onClick={logout}
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
      </div>
    </header>
  )
}
