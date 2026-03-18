import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { getRoyaltyReport, type RoyaltyReport } from '@/services/cloudApi'
import { downloadCsv, printReport } from '@/lib/export'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(m: string): string {
  const [y, mo] = m.split('-')
  const date = new Date(+y, +mo - 1)
  return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

function prevMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 2) // mo is 1-based, Date month is 0-based
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo) // mo is 1-based, this gives next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const STATUS_COLORS: Record<string, string> = {
  active: '#44ff88',
  suspended: '#ff4444',
  onboarding: '#ffaa00',
}

export default function SuperAdminRoyaltiesPage() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(currentMonth())
  const [report, setReport] = useState<RoyaltyReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    getRoyaltyReport(month)
      .then((r) => { if (active) setReport(r) })
      .catch(() => { if (active) setReport(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [month])

  const exportCsv = () => {
    if (!report) return
    const headers = ['Sede', 'Stato', 'Sessioni', 'Gettoni', 'Ricavo (€)']
    const rows = report.breakdown.map((v) => [
      v.venueName, v.status, String(v.sessions), String(v.tokensConsumed), v.revenue.toFixed(2),
    ])
    rows.push(['TOTALE', '', String(report.totals.sessions), String(report.totals.tokensConsumed), report.totals.revenue.toFixed(2)])
    downloadCsv(`royalty-${month}`, headers, rows)
  }

  const exportPdf = () => {
    if (!report) return
    const headers = ['Sede', 'Stato', 'Sessioni', 'Gettoni', 'Ricavo (€)']
    const rows = report.breakdown.map((v) => [
      v.venueName, v.status, String(v.sessions), String(v.tokensConsumed), `€${v.revenue.toFixed(2)}`,
    ])
    const totals = ['TOTALE', '', String(report.totals.sessions), String(report.totals.tokensConsumed), `€${report.totals.revenue.toFixed(2)}`]
    printReport(
      `Report Royalty — ${formatMonth(month)}`,
      `Tariffa: €${report.tokenRate.toFixed(2)}/gettone | Generato: ${new Date().toLocaleDateString('it-IT')}`,
      headers, rows, totals,
    )
  }

  const kpiStyle: React.CSSProperties = {
    background: 'rgba(22,20,45,0.6)', border: '1px solid rgba(123,100,169,0.12)',
    borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8,
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: 'none', background: active ? 'rgba(230,0,126,0.12)' : 'transparent',
    color: active ? '#E6007E' : 'rgba(255,255,255,0.4)', fontFamily: 'Outfit, sans-serif',
  })

  return (
    <div
      className="noise-overlay relative flex flex-col overflow-hidden"
      style={{ width: 1920, height: 1080, background: 'var(--color-surface)', fontFamily: 'Outfit, sans-serif' }}
    >
      <div className="blob" style={{ width: 800, height: 800, filter: 'blur(160px)', background: 'rgba(82,49,137,0.18)', top: -300, left: -300 }} />
      <div className="blob" style={{ width: 600, height: 600, filter: 'blur(150px)', background: 'rgba(230,0,126,0.08)', bottom: -250, right: -200 }} />

      <div className="relative z-10 flex flex-1 flex-col min-h-0 p-8">
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/super-admin')}
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: '1px solid rgba(123,100,169,0.18)',
                background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Report Royalty</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Month picker */}
            <div className="flex items-center gap-1">
              <button onClick={() => setMonth(prevMonth(month))} style={chipStyle(false)}>←</button>
              <span style={{ fontSize: 14, fontWeight: 700, padding: '0 12px', textTransform: 'capitalize' }}>
                {formatMonth(month)}
              </span>
              <button
                onClick={() => setMonth(nextMonth(month))}
                disabled={month >= currentMonth()}
                style={{ ...chipStyle(false), opacity: month >= currentMonth() ? 0.3 : 1 }}
              >
                →
              </button>
            </div>
            {/* Export */}
            {report && (
              <div className="flex gap-2">
                <button onClick={exportCsv} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(123,100,169,0.15)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', fontFamily: 'Outfit, sans-serif' }}>
                  CSV
                </button>
                <button onClick={exportPdf} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(123,100,169,0.15)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', fontFamily: 'Outfit, sans-serif' }}>
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>Caricamento...</span>
          </div>
        ) : !report ? (
          <div className="flex items-center justify-center flex-1">
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>Errore caricamento report</span>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              <div style={kpiStyle}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Sedi attive</span>
                <span style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{report.totals.venues}</span>
              </div>
              <div style={kpiStyle}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Sessioni</span>
                <span style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{report.totals.sessions.toLocaleString('it-IT')}</span>
              </div>
              <div style={kpiStyle}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Gettoni consumati</span>
                <span style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: '#E6007E' }}>{report.totals.tokensConsumed.toLocaleString('it-IT')}</span>
              </div>
              <div style={{ ...kpiStyle, border: '1px solid rgba(230,0,126,0.2)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Ricavo totale</span>
                <span style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: '#44ff88' }}>€{report.totals.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Rate info */}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
              Tariffa: €{report.tokenRate.toFixed(2)} / gettone
            </div>

            {/* Venue breakdown table */}
            <div
              className="flex-1 min-h-0 overflow-auto"
              style={{
                borderRadius: 16, border: '1px solid rgba(123,100,169,0.12)',
                background: 'rgba(22,20,45,0.6)', backdropFilter: 'blur(12px)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.1)' }}>
                    {['Sede', 'Stato', 'Sessioni', 'Gettoni', 'Ricavo'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600,
                          letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
                          position: 'sticky', top: 0, background: 'rgba(22,20,45,0.95)', backdropFilter: 'blur(12px)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.breakdown.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>
                        Nessuna attività questo mese
                      </td>
                    </tr>
                  ) : (
                    <>
                      {report.breakdown.map((v) => (
                        <tr key={v.venueId} style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13 }}>{v.venueName}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: STATUS_COLORS[v.status] || '#fff' }}>{v.status}</span>
                          </td>
                          <td style={{ padding: '10px 16px', fontWeight: 600 }}>{v.sessions}</td>
                          <td style={{ padding: '10px 16px', fontWeight: 700, color: '#E6007E', fontVariantNumeric: 'tabular-nums' }}>
                            {v.tokensConsumed.toLocaleString('it-IT')}
                          </td>
                          <td style={{ padding: '10px 16px', fontWeight: 700, color: '#44ff88', fontVariantNumeric: 'tabular-nums' }}>
                            €{v.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr style={{ borderTop: '2px solid rgba(123,100,169,0.2)', background: 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 13 }}>TOTALE</td>
                        <td />
                        <td style={{ padding: '12px 16px', fontWeight: 800 }}>{report.totals.sessions.toLocaleString('it-IT')}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#E6007E' }}>{report.totals.tokensConsumed.toLocaleString('it-IT')}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#44ff88' }}>€{report.totals.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
