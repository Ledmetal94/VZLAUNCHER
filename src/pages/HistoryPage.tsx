import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { getSessionHistory, type CloudSession } from '@/services/cloudApi'

const CATEGORY_LABELS: Record<string, string> = {
  arcade_light: 'Arcade Light',
  arcade_full: 'Arcade Full',
  avventura: 'Avventura',
  lasergame: 'Laser Game',
  escape: 'Escape Room',
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#44ff88',
  error: '#ff4444',
  cancelled: '#ffaa00',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<CloudSession[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 15

  useEffect(() => {
    let active = true
    setLoading(true)
    getSessionHistory(page, pageSize)
      .then((res) => {
        if (active) {
          setSessions(res.data)
          setTotal(res.total)
        }
      })
      .catch(() => {
        if (active) setSessions([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [page])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div
      className="noise-overlay relative flex flex-col overflow-hidden"
      style={{ width: 1920, height: 1080, background: 'var(--color-surface)' }}
    >
      {/* Ambient blobs */}
      <div className="blob" style={{ width: 800, height: 800, filter: 'blur(160px)', background: 'rgba(82,49,137,0.18)', top: -300, left: -300 }} />
      <div className="blob" style={{ width: 600, height: 600, filter: 'blur(150px)', background: 'rgba(230,0,126,0.08)', bottom: -250, right: -200 }} />

      <div className="relative z-10 flex flex-1 flex-col min-h-0">
        {/* Header bar */}
        <div
          className="flex shrink-0 items-center justify-between"
          style={{
            height: 56,
            padding: '0 32px',
            borderBottom: '1px solid rgba(123,100,169,0.12)',
            background: 'rgba(15,14,31,0.75)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              style={{
                height: 36,
                borderRadius: 8,
                border: '1px solid rgba(123,100,169,0.18)',
                background: 'rgba(255,255,255,0.025)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '0 14px',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Catalogo
            </button>
            <span style={{ fontSize: 20, fontWeight: 800 }}>Storico sessioni</span>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {total} sessioni totali
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto" style={{ padding: '20px 32px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Caricamento...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div style={{ fontSize: 40, opacity: 0.3 }}>&#9671;</div>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.15)' }}>
                Nessuna sessione registrata
              </span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.12)' }}>
                  {['Gioco', 'Categoria', 'Data', 'Giocatori', 'Durata', 'Gettoni', 'Stato'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.25)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}
                  >
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 700 }}>
                      {s.gameId?.slice(0, 8) || '—'}
                    </td>
                    <td style={{ padding: '12px', fontSize: 11, color: '#7B64A9' }}>
                      {CATEGORY_LABELS[s.category] || s.category}
                    </td>
                    <td style={{ padding: '12px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      {formatDate(s.startedAt)}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 600 }}>
                      {s.playersCount}
                    </td>
                    <td style={{ padding: '12px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDuration(s.durationActual || 0)}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 700 }}>
                      {s.tokensConsumed}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: STATUS_COLORS[s.status] || '#fff',
                          textTransform: 'uppercase',
                          letterSpacing: '.06em',
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex shrink-0 items-center justify-center gap-3"
            style={{
              height: 50,
              borderTop: '1px solid rgba(123,100,169,0.12)',
              background: 'rgba(15,14,31,0.5)',
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid rgba(123,100,169,0.18)',
                background: 'rgba(255,255,255,0.025)',
                color: page <= 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
                fontSize: 11,
                fontWeight: 600,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Precedente
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Pagina {page} di {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid rgba(123,100,169,0.18)',
                background: 'rgba(255,255,255,0.025)',
                color: page >= totalPages ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
                fontSize: 11,
                fontWeight: 600,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Successiva
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
