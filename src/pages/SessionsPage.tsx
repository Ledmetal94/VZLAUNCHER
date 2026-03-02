import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClockCounterClockwise, GameController, Clock, Tag, ArrowRight, Export, FunnelSimple } from '@phosphor-icons/react'
import { Layout } from '../components/layout/Layout'
import { useSessionStore, type SessionRecord } from '../store/sessionStore'
import { GAMES } from '../data/games'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h ${m % 60}m` }
  return `${m}m ${String(seconds % 60).padStart(2, '0')}s`
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isToday(ms: number) {
  const d = new Date(ms), now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isThisWeek(ms: number) {
  return Date.now() - ms < 7 * 24 * 60 * 60 * 1000
}

function exportCsv(sessions: SessionRecord[]) {
  const header = 'ID,Game,Operator,Start,Duration (s),Price (€)'
  const rows = sessions.map((s) =>
    [s.id, s.gameName, s.operatorName, new Date(s.startTime).toISOString(), s.duration ?? '', s.price].join(',')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `vzlauncher-sessions-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

type DateFilter = 'all' | 'today' | 'week'

export function SessionsPage() {
  const history = useSessionStore((s) => s.history)
  const current = useSessionStore((s) => s.current)
  const navigate = useNavigate()

  const [gameFilter, setGameFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')

  const filtered = useMemo(() => {
    return history.filter((s) => {
      if (gameFilter !== 'all' && s.gameSlug !== gameFilter) return false
      if (dateFilter === 'today' && !isToday(s.startTime)) return false
      if (dateFilter === 'week' && !isThisWeek(s.startTime)) return false
      return true
    })
  }, [history, gameFilter, dateFilter])

  const stats = useMemo(() => {
    const totalRevenue = filtered.reduce((sum, s) => sum + s.price, 0)
    const totalDuration = filtered.reduce((sum, s) => sum + (s.duration ?? 0), 0)
    const avgDuration = filtered.length ? Math.floor(totalDuration / filtered.length) : 0
    return { totalRevenue, avgDuration, count: filtered.length }
  }, [filtered])

  const gameOptions = useMemo(() => {
    const slugs = [...new Set(history.map((s) => s.gameSlug))]
    return slugs.map((slug) => ({ slug, name: GAMES.find((g) => g.slug === slug)?.name ?? slug }))
  }, [history])

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-[#F5F5F5]">
            Session <span className="text-[#E5007E]">History</span>
          </h1>
          <p className="text-[#888888] text-sm mt-1">{history.length} total sessions</p>
        </div>
        <div className="flex items-center gap-2">
          {current && (
            <button
              onClick={() => navigate('/session/active')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00E67611] border border-[#00E67633] text-[#00E676] text-sm font-semibold hover:bg-[#00E67622] transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              Active Session
              <ArrowRight size={16} />
            </button>
          )}
          {filtered.length > 0 && (
            <button
              onClick={() => exportCsv(filtered)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#888888] text-sm hover:text-[#F5F5F5] hover:border-white/[0.15] transition-all cursor-pointer"
            >
              <Export size={16} />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Sessions', value: stats.count },
            { label: 'Total Revenue', value: `€${stats.totalRevenue}` },
            { label: 'Avg Duration', value: stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-2xl font-black text-[#F5F5F5]">{value}</p>
              <p className="text-[#888888] text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {history.length > 0 && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2 text-[#888888]">
            <FunnelSimple size={16} />
            <span className="text-xs font-medium">Filter:</span>
          </div>

          {/* Date filter */}
          {(['all', 'today', 'week'] as DateFilter[]).map((d) => (
            <button
              key={d}
              onClick={() => setDateFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                dateFilter === d
                  ? 'bg-[#E5007E] text-white'
                  : 'bg-white/[0.04] border border-white/[0.08] text-[#888888] hover:text-[#F5F5F5]'
              }`}
            >
              {d === 'all' ? 'All time' : d === 'today' ? 'Today' : 'This week'}
            </button>
          ))}

          {/* Game filter */}
          {gameOptions.length > 1 && (
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="bg-[#141414] border border-[#2A2A2A] text-[#888888] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E5007E] cursor-pointer"
            >
              <option value="all">All games</option>
              {gameOptions.map(({ slug, name }) => (
                <option key={slug} value={slug}>{name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* List */}
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <ClockCounterClockwise size={48} weight="thin" color="#2A2A2A" />
          <p className="text-[#888888] text-base">No sessions yet.</p>
          <p className="text-[#2A2A2A] text-sm">Sessions will appear here after games are launched.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-[#888888]">No sessions match the current filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[#141414]">
                <img src={session.poster} alt={session.gameName} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#F5F5F5] font-semibold truncate">{session.gameName}</p>
                <p className="text-[#888888] text-xs mt-0.5">{formatDate(session.startTime)}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-[#888888] text-sm">
                  <Clock size={14} weight="thin" />
                  <span>{session.duration != null ? formatDuration(session.duration) : '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#E5007E] text-sm font-semibold">
                  <Tag size={14} weight="thin" />
                  <span>€{session.price}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#888888] text-xs">
                  <GameController size={14} weight="thin" />
                  <span>{session.operatorName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
