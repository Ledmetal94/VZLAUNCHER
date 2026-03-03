import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChartBar,
  CurrencyEur,
  Clock,
  GameController,
  User,
  CalendarBlank,
  ArrowRight,
  TrendUp,
  FilePdf,
} from '@phosphor-icons/react'
import { Layout } from '../components/layout/Layout'
import { useSessionStore } from '../store/sessionStore'
import { TimeSeriesChart, type DayDataPoint } from '../components/analytics/TimeSeriesChart'
import { GamePopularityChart, type GameStat } from '../components/analytics/GamePopularityChart'
import { OperatorStatsTable, type OperatorStat } from '../components/analytics/OperatorStatsTable'
import { exportAnalyticsPdf } from '../utils/exportAnalyticsPdf'
import { useAuthStore } from '../store/authStore'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h ${m % 60}m` }
  return `${m}m ${String(seconds % 60).padStart(2, '0')}s`
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function isToday(ms: number) {
  const d = new Date(ms), now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isThisWeek(ms: number) {
  return Date.now() - ms < 7 * 24 * 60 * 60 * 1000
}

type Range = '7d' | '14d' | '30d'

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '14d': 14, '30d': 30 }

export function AnalyticsPage() {
  const history = useSessionStore((s) => s.history)
  const navigate = useNavigate()
  const venueName = useAuthStore((s) => s.venueName) ?? 'Virtual Zone'
  const [range, setRange] = useState<Range>('14d')

  const stats = useMemo(() => {
    const completed = history.filter((s) => s.endTime != null)
    const total = completed.length
    const totalRevenue = completed.reduce((sum, s) => sum + s.price, 0)
    const totalDuration = completed.reduce((sum, s) => sum + (s.duration ?? 0), 0)
    const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0
    const todayCount = completed.filter((s) => isToday(s.startTime)).length
    const weekCount = completed.filter((s) => isThisWeek(s.startTime)).length
    const todayRevenue = completed.filter((s) => isToday(s.startTime)).reduce((sum, s) => sum + s.price, 0)

    // Top game + full game stats
    const gameCounts: Record<string, { name: string; count: number; revenue: number; totalDuration: number }> = {}
    for (const s of completed) {
      if (!gameCounts[s.gameSlug]) gameCounts[s.gameSlug] = { name: s.gameName, count: 0, revenue: 0, totalDuration: 0 }
      gameCounts[s.gameSlug].count++
      gameCounts[s.gameSlug].revenue += s.price
      gameCounts[s.gameSlug].totalDuration += s.duration ?? 0
    }
    const gameRanking = Object.entries(gameCounts).sort((a, b) => b[1].count - a[1].count)
    const topGame = gameRanking[0]?.[1] ?? null
    const gameStats: GameStat[] = gameRanking.map(([slug, g]) => ({
      slug,
      name: g.name,
      count: g.count,
      revenue: g.revenue,
      avgDuration: g.count > 0 ? Math.round(g.totalDuration / g.count) : 0,
    }))

    // Operator stats
    const opCounts: Record<string, { name: string; count: number; revenue: number; totalDuration: number }> = {}
    for (const s of completed) {
      if (!opCounts[s.operatorId]) opCounts[s.operatorId] = { name: s.operatorName, count: 0, revenue: 0, totalDuration: 0 }
      opCounts[s.operatorId].count++
      opCounts[s.operatorId].revenue += s.price
      opCounts[s.operatorId].totalDuration += s.duration ?? 0
    }
    const operatorStats: OperatorStat[] = Object.entries(opCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([id, o]) => ({
        id,
        name: o.name,
        count: o.count,
        revenue: o.revenue,
        avgDuration: o.count > 0 ? Math.round(o.totalDuration / o.count) : 0,
      }))
    const topOperator = operatorStats[0] ?? null

    return { total, totalRevenue, avgDuration, todayCount, weekCount, todayRevenue, topGame, topOperator, gameRanking, gameStats, operatorStats }
  }, [history])

  const chartData = useMemo<DayDataPoint[]>(() => {
    const days = RANGE_DAYS[range]
    const now = new Date()
    const points: DayDataPoint[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const start = d.getTime()
      const end = start + 86400000
      const daysessions = history.filter((s) => s.startTime >= start && s.startTime < end && s.endTime != null)
      points.push({
        label: d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        sessions: daysessions.length,
        revenue: daysessions.reduce((sum, s) => sum + s.price, 0),
      })
    }
    return points
  }, [history, range])

  const recent = history.filter((s) => s.endTime != null).slice(0, 5)

  const kpiCards = [
    {
      label: 'Total Sessions',
      value: stats.total,
      sub: `${stats.weekCount} this week`,
      Icon: ChartBar,
      color: '#E5007E',
      bg: '#E5007E14',
    },
    {
      label: 'Total Revenue',
      value: `€${stats.totalRevenue}`,
      sub: `€${stats.todayRevenue} today`,
      Icon: CurrencyEur,
      color: '#00E676',
      bg: '#00E67614',
    },
    {
      label: 'Avg Duration',
      value: stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : '—',
      sub: `across ${stats.total} sessions`,
      Icon: Clock,
      color: '#7C6AF7',
      bg: '#7C6AF714',
    },
    {
      label: 'Today',
      value: stats.todayCount,
      sub: `session${stats.todayCount !== 1 ? 's' : ''} played`,
      Icon: CalendarBlank,
      color: '#F59E0B',
      bg: '#F59E0B14',
    },
  ]

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#F5F5F5]">
            Analytics <span className="text-[#E5007E]">Dashboard</span>
          </h1>
          <p className="text-[#888888] text-sm mt-1">Performance overview for this venue</p>
        </div>
        <div className="flex items-center gap-2">
          {stats.total > 0 && (
            <button
              onClick={() => exportAnalyticsPdf({
                venueName,
                generatedAt: new Date(),
                kpis: {
                  total: stats.total,
                  totalRevenue: stats.totalRevenue,
                  avgDuration: stats.avgDuration,
                  todayCount: stats.todayCount,
                  weekCount: stats.weekCount,
                },
                gameStats: stats.gameStats,
                operatorStats: stats.operatorStats,
                recentSessions: history.filter((s) => s.endTime != null),
              })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E5007E14] border border-[#E5007E33] text-[#E5007E] text-sm font-medium hover:bg-[#E5007E22] transition-all cursor-pointer"
            >
              <FilePdf size={16} />
              Export PDF
            </button>
          )}
          <button
            onClick={() => navigate('/sessions')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#888888] text-sm hover:text-[#F5F5F5] hover:border-white/[0.15] transition-all cursor-pointer"
          >
            Full History
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {stats.total === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <ChartBar size={56} weight="thin" color="#2A2A2A" />
          <p className="text-[#888888] text-base">No session data yet.</p>
          <p className="text-[#444] text-sm">Analytics will populate after the first game session ends.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {kpiCards.map(({ label, value, sub, Icon, color, bg }) => (
              <div
                key={label}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[#888888] text-xs font-medium uppercase tracking-wider">{label}</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                    <Icon size={16} weight="bold" style={{ color }} />
                  </div>
                </div>
                <p className="text-3xl font-black" style={{ color: '#F5F5F5' }}>{value}</p>
                <p className="text-[#555] text-xs flex items-center gap-1">
                  <TrendUp size={12} style={{ color: '#555' }} />
                  {sub}
                </p>
              </div>
            ))}
          </div>

          {/* Time-series chart */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#888888] text-xs font-medium uppercase tracking-wider">Sessions & Revenue Over Time</p>
              <div className="flex items-center gap-1">
                {(['7d', '14d', '30d'] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      range === r
                        ? 'bg-[#E5007E] text-white'
                        : 'text-[#555] hover:text-[#888]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <TimeSeriesChart data={chartData} />
          </div>

          {/* Game Popularity + Top Operator */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Game popularity — spans 2 cols */}
            <div className="col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <GameController size={16} weight="bold" color="#E5007E" />
                <p className="text-[#888888] text-xs font-medium uppercase tracking-wider">Game Popularity</p>
              </div>
              {stats.gameStats.length > 0 ? (
                <GamePopularityChart games={stats.gameStats} />
              ) : (
                <p className="text-[#555] text-sm py-4">No data</p>
              )}
            </div>

            {/* Operator performance */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} weight="bold" color="#7C6AF7" />
                <p className="text-[#888888] text-xs font-medium uppercase tracking-wider">Operator Performance</p>
              </div>
              <OperatorStatsTable operators={stats.operatorStats} />
            </div>
          </div>

          {/* Recent Sessions */}
          {recent.length > 0 && (
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[#888888] text-xs font-medium uppercase tracking-wider">Recent Sessions</p>
                <button
                  onClick={() => navigate('/sessions')}
                  className="text-[#E5007E] text-xs hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {recent.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#141414] flex-shrink-0">
                      <img src={s.poster} alt={s.gameName} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F5] text-sm font-medium truncate">{s.gameName}</p>
                      <p className="text-[#555] text-xs">{formatDate(s.startTime)} · {s.operatorName}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                      {s.duration != null && (
                        <span className="text-[#888]">{formatDuration(s.duration)}</span>
                      )}
                      <span className="text-[#E5007E] font-semibold">€{s.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
