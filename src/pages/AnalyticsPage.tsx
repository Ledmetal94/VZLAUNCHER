import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import { getAnalyticsSummary, getOperators, type AnalyticsSummary, type CloudOperator } from '@/services/cloudApi'

const CATEGORY_LABELS: Record<string, string> = {
  arcade_light: 'Arcade Light',
  arcade_full: 'Arcade Full',
  avventura: 'Avventura',
  lasergame: 'Laser Game',
  escape: 'Escape Room',
}

const PIE_COLORS = ['#E6007E', '#523189', '#7B64A9', '#44ff88', '#ffaa00']

const RANGE_OPTIONS = [
  { label: 'Oggi', days: 0 },
  { label: '7 giorni', days: 7 },
  { label: '30 giorni', days: 30 },
  { label: '90 giorni', days: 90 },
]

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(30)
  const [operators, setOperators] = useState<CloudOperator[]>([])
  const [operatorId, setOperatorId] = useState('')

  useEffect(() => {
    getOperators().then(setOperators).catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)

    const endDate = new Date().toISOString()
    const startDate = rangeDays === 0
      ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      : new Date(Date.now() - rangeDays * 86400000).toISOString()

    getAnalyticsSummary(startDate, endDate, operatorId || undefined)
      .then((res) => {
        if (active) setData(res)
      })
      .catch(() => {
        if (active) setData(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [rangeDays, operatorId])

  const kpis = data?.kpis

  // Prepare pie data
  const pieData = (data?.categoryBreakdown || []).map((cat) => ({
    name: CATEGORY_LABELS[cat.category] || cat.category,
    value: cat.sessions,
  }))

  // Prepare daily data with short date labels
  const dailyData = (data?.daily || []).map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }))

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
            <span style={{ fontSize: 20, fontWeight: 800 }}>Analisi</span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid rgba(123,100,169,0.18)',
                background: 'rgba(255,255,255,0.03)',
                color: operatorId ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 11,
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="">Tutti gli operatori</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>

            <div style={{ width: 1, height: 20, background: 'rgba(123,100,169,0.15)' }} />

            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setRangeDays(opt.days)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: `1px solid ${rangeDays === opt.days ? 'rgba(230,0,126,0.5)' : 'rgba(123,100,169,0.18)'}`,
                  background: rangeDays === opt.days ? 'rgba(230,0,126,0.12)' : 'rgba(255,255,255,0.025)',
                  color: rangeDays === opt.days ? '#E6007E' : 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto" style={{ padding: '24px 32px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Caricamento...</span>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div style={{ fontSize: 40, opacity: 0.3 }}>&#9671;</div>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.15)' }}>
                Impossibile caricare le analisi
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-4">
                <KpiCard label="Sessioni totali" value={kpis!.totalSessions} />
                <KpiCard label="Gettoni consumati" value={kpis!.totalTokens} accent />
                <KpiCard label="Giocatori totali" value={kpis!.totalPlayers} />
                <KpiCard label="Durata media" value={formatDuration(kpis!.avgDuration)} />
              </div>

              {/* Secondary KPIs */}
              <div className="grid grid-cols-3 gap-4">
                <KpiCard label="Completate" value={kpis!.completedSessions} color="#44ff88" />
                <KpiCard label="Errori" value={kpis!.errorCount} color="#ff4444" />
                <KpiCard label="Cancellate" value={kpis!.cancelledCount} color="#ffaa00" />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-3 gap-4" style={{ height: 280 }}>
                {/* Daily sessions bar chart */}
                <ChartPanel title="Sessioni giornaliere" className="col-span-2">
                  {dailyData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                        <XAxis
                          dataKey="label"
                          tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                          axisLine={{ stroke: 'rgba(123,100,169,0.12)' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="sessions" fill="#E6007E" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartPanel>

                {/* Category pie chart */}
                <ChartPanel title="Per categoria">
                  {pieData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <div className="flex items-center h-full">
                      <ResponsiveContainer width="55%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius="45%"
                            outerRadius="80%"
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        {pieData.map((entry, i) => (
                          <div key={entry.name} className="flex items-center gap-2">
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {entry.name}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ChartPanel>
              </div>

              {/* Revenue trend + Top games row */}
              <div className="grid grid-cols-3 gap-4" style={{ height: 240 }}>
                {/* Token consumption trend line */}
                <ChartPanel title="Gettoni consumati (trend)" className="col-span-2">
                  {dailyData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                        <XAxis
                          dataKey="label"
                          tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                          axisLine={{ stroke: 'rgba(123,100,169,0.12)' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="tokens"
                          stroke="#E6007E"
                          strokeWidth={2}
                          dot={{ fill: '#E6007E', r: 3, strokeWidth: 0 }}
                          activeDot={{ fill: '#fff', stroke: '#E6007E', strokeWidth: 2, r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="players"
                          stroke="#523189"
                          strokeWidth={2}
                          dot={{ fill: '#523189', r: 3, strokeWidth: 0 }}
                          activeDot={{ fill: '#fff', stroke: '#523189', strokeWidth: 2, r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartPanel>

                {/* Top games */}
                <ChartPanel title="Top 5 giochi">
                  {data.topGames.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', height: '100%' }}>
                      {data.topGames.map((g, i) => {
                        const maxCount = data.topGames[0].count
                        const pct = maxCount > 0 ? (g.count / maxCount) * 100 : 0
                        return (
                          <div key={g.gameId}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                                <span style={{ color: '#E6007E', marginRight: 6 }}>{i + 1}</span>
                                {g.gameName}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                                {g.count}
                              </span>
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
                              <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                borderRadius: 3,
                                background: `linear-gradient(90deg, ${PIE_COLORS[i % PIE_COLORS.length]}, ${PIE_COLORS[(i + 1) % PIE_COLORS.length]})`,
                              }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ChartPanel>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Shared Components ───────────────────────────────────── */

function KpiCard({ label, value, accent, color }: {
  label: string; value: string | number; accent?: boolean; color?: string
}) {
  return (
    <div style={{
      background: 'rgba(22,20,45,0.6)',
      border: `1px solid ${accent ? 'rgba(230,0,126,0.2)' : 'rgba(123,100,169,0.12)'}`,
      borderRadius: 16,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
      <span style={{ fontSize: 32, fontWeight: 900, color: color || (accent ? '#E6007E' : '#fff'), letterSpacing: '-0.02em', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString('it-IT') : value}
      </span>
    </div>
  )
}

function ChartPanel({ title, children, className }: {
  title: string; children: React.ReactNode; className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background: 'rgba(22,20,45,0.6)',
        border: '1px solid rgba(123,100,169,0.12)',
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12, flexShrink: 0 }}>
        {title}
      </span>
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-full">
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Nessun dato</span>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(22,20,45,0.95)',
      border: '1px solid rgba(123,100,169,0.25)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 11,
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4, color: 'rgba(255,255,255,0.6)' }}>{label}</div>}
      {payload.map((entry) => (
        <div key={entry.name} style={{ color: entry.color, fontWeight: 600 }}>
          {entry.name}: {entry.value.toLocaleString('it-IT')}
        </div>
      ))}
    </div>
  )
}
