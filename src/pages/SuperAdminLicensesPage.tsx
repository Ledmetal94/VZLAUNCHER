import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { getSuperAdminLicenses, type VenueLicense } from '@/services/cloudApi'

const STATUS_COLORS: Record<string, string> = {
  active: '#44ff88',
  suspended: '#ff4444',
  onboarding: '#ffaa00',
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Mai'
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function daysColor(days: number | null): string {
  if (days === null) return 'rgba(255,255,255,0.3)'
  if (days < 7) return '#ff4444'
  if (days < 14) return '#f59e0b'
  return '#44ff88'
}

function lastSeenColor(ms: number | null): string {
  if (ms === null) return 'rgba(255,255,255,0.15)'
  const hours = ms / (1000 * 60 * 60)
  if (hours < 1) return '#44ff88'
  if (hours < 24) return '#f59e0b'
  return '#ff4444'
}

function formatLastSeen(ms: number | null): string {
  if (ms === null) return 'Mai'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 1) {
    const mins = Math.floor(ms / (1000 * 60))
    return `${mins}m fa`
  }
  if (hours < 48) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  return `${days}g fa`
}

export default function SuperAdminLicensesPage() {
  const navigate = useNavigate()
  const [licenses, setLicenses] = useState<VenueLicense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSuperAdminLicenses()
      .then(setLicenses)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const onlineCount = licenses.filter((l) => l.lastSeenAgoMs !== null && l.lastSeenAgoMs < 60 * 60 * 1000).length

  return (
    <div
      className="noise-overlay relative flex flex-col overflow-hidden"
      style={{ width: 1920, height: 1080, background: 'var(--color-surface)', fontFamily: 'Outfit, sans-serif' }}
    >
      <div className="blob" style={{ width: 800, height: 800, filter: 'blur(160px)', background: 'rgba(82,49,137,0.18)', top: -300, left: -300 }} />
      <div className="blob" style={{ width: 600, height: 600, filter: 'blur(150px)', background: 'rgba(230,0,126,0.08)', bottom: -250, right: -200 }} />

      <div className="relative z-10 flex flex-1 flex-col min-h-0 p-8">
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/super-admin')}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(123,100,169,0.18)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Licenze</h1>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              {onlineCount}/{licenses.length} online
            </span>
          </div>
        </div>

        <div
          className="flex-1 min-h-0 overflow-auto"
          style={{ borderRadius: 16, border: '1px solid rgba(123,100,169,0.12)', background: 'rgba(22,20,45,0.6)', backdropFilter: 'blur(12px)' }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.1)' }}>
                {['Sede', 'Stato', 'Ultimo rinnovo', 'Valida fino', 'Giorni rimasti', 'Ultimo contatto', 'Grazia offline'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', position: 'sticky', top: 0, background: 'rgba(22,20,45,0.95)', backdropFilter: 'blur(12px)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>Caricamento...</td></tr>
              ) : licenses.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>Nessuna sede</td></tr>
              ) : (
                licenses.map((l) => (
                  <tr key={l.venueId} style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13 }}>{l.venueName}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6, color: STATUS_COLORS[l.status] || '#fff', background: `${STATUS_COLORS[l.status] || '#fff'}15` }}>{l.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.5)' }}>{formatDate(l.lastRenewedAt)}</td>
                    <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.5)' }}>{formatDate(l.validUntil)}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: daysColor(l.daysRemaining), fontVariantNumeric: 'tabular-nums' }}>
                      {l.daysRemaining !== null ? `${l.daysRemaining}g` : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div className="flex items-center gap-1.5">
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: lastSeenColor(l.lastSeenAgoMs), flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: lastSeenColor(l.lastSeenAgoMs) }}>{formatLastSeen(l.lastSeenAgoMs)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                      {l.graceHoursRemaining > 0 ? `${l.graceHoursRemaining}h` : 'Scaduto'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
