import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClockCounterClockwise,
  Clock,
  Tag,
  ArrowRight,
  Export,
  FunnelSimple,
  ArrowUp,
  ArrowDown,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  X,
} from '@phosphor-icons/react'
import { Layout } from '../components/layout/Layout'
import { useSessionStore, type SessionRecord } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'

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

function exportCsv(sessions: SessionRecord[]) {
  const header = 'ID,Game,Operator,Start,Duration (s),Price (€),Difficulty'
  const rows = sessions.map((s) =>
    [s.id, s.gameName, s.operatorName, new Date(s.startTime).toISOString(),
     s.duration ?? '', s.price, s.difficulty ?? ''].join(',')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `vzlauncher-sessions-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

type SortKey = 'startTime' | 'gameName' | 'operatorName' | 'duration' | 'price'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 15

const SYNC_COLORS: Record<string, string> = {
  synced: '#00E676',
  pending: '#F59E0B',
  error: '#FF4444',
}

export function SessionsPage() {
  const allHistory = useSessionStore((s) => s.history)
  const current = useSessionStore((s) => s.current)
  const navigate = useNavigate()
  const { role, userId } = useAuthStore()

  // Normal users only see their own sessions
  const history = role === 'admin' ? allHistory : allHistory.filter((s) => s.operatorId === userId)

  // Filters
  const [search, setSearch] = useState('')
  const [gameFilter, setGameFilter] = useState('all')
  const [operatorFilter, setOperatorFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('startTime')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Pagination
  const [page, setPage] = useState(1)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const gameOptions = useMemo(() => {
    const slugs = [...new Set(history.map((s) => s.gameSlug))]
    return slugs.map((slug) => ({ slug, name: history.find((s) => s.gameSlug === slug)?.gameName ?? slug }))
  }, [history])

  const operatorOptions = useMemo(() => {
    const ids = [...new Set(history.map((s) => s.operatorId))]
    return ids.map((id) => ({ id, name: history.find((s) => s.operatorId === id)?.operatorName ?? id }))
  }, [history])

  const filtered = useMemo(() => {
    let result = [...history]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((s) =>
        s.gameName.toLowerCase().includes(q) ||
        s.operatorName.toLowerCase().includes(q) ||
        s.id.includes(q)
      )
    }
    if (gameFilter !== 'all') result = result.filter((s) => s.gameSlug === gameFilter)
    if (operatorFilter !== 'all') result = result.filter((s) => s.operatorId === operatorFilter)
    if (dateFrom) result = result.filter((s) => s.startTime >= new Date(dateFrom).getTime())
    if (dateTo) result = result.filter((s) => s.startTime <= new Date(dateTo).getTime() + 86400000)
    if (minPrice) result = result.filter((s) => s.price >= Number(minPrice))
    if (maxPrice) result = result.filter((s) => s.price <= Number(maxPrice))
    return result
  }, [history, search, gameFilter, operatorFilter, dateFrom, dateTo, minPrice, maxPrice])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number | string = a[sortKey] ?? 0
      let bv: number | string = b[sortKey] ?? 0
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summaryStats = useMemo(() => ({
    count: filtered.length,
    revenue: filtered.reduce((s, r) => s + r.price, 0),
    avgDuration: filtered.length
      ? Math.round(filtered.reduce((s, r) => s + (r.duration ?? 0), 0) / filtered.length)
      : 0,
  }), [filtered])

  const hasActiveFilters = search || gameFilter !== 'all' || operatorFilter !== 'all' || dateFrom || dateTo || minPrice || maxPrice

  function clearFilters() {
    setSearch(''); setGameFilter('all'); setOperatorFilter('all')
    setDateFrom(''); setDateTo(''); setMinPrice(''); setMaxPrice('')
    setPage(1)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUp size={12} className="opacity-20" />
    return sortDir === 'asc' ? <ArrowUp size={12} color="#E5007E" /> : <ArrowDown size={12} color="#E5007E" />
  }

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

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Sessions', value: summaryStats.count },
            { label: 'Total Revenue', value: `€${summaryStats.revenue}` },
            { label: 'Avg Duration', value: summaryStats.avgDuration > 0 ? formatDuration(summaryStats.avgDuration) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-2xl font-black text-[#F5F5F5]">{value}</p>
              <p className="text-[#888888] text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter bar */}
      {history.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              placeholder="Search game, operator…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-sm text-[#F5F5F5] placeholder-[#444] focus:outline-none focus:border-[#E5007E] transition-colors"
            />
          </div>

          {/* Toggle advanced filters */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all cursor-pointer ${
              showFilters || hasActiveFilters
                ? 'bg-[#E5007E22] border-[#E5007E55] text-[#E5007E]'
                : 'bg-white/[0.04] border-white/[0.08] text-[#888888] hover:text-[#F5F5F5]'
            }`}
          >
            <FunnelSimple size={16} />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#E5007E]" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[#888] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="grid grid-cols-3 gap-3 mb-5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          {/* Game */}
          <div>
            <label className="text-[#555] text-xs mb-1 block">Game</label>
            <select
              value={gameFilter}
              onChange={(e) => { setGameFilter(e.target.value); setPage(1) }}
              className="w-full bg-[#141414] border border-[#2A2A2A] text-[#888] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#E5007E] cursor-pointer"
            >
              <option value="all">All games</option>
              {gameOptions.map(({ slug, name }) => (
                <option key={slug} value={slug}>{name}</option>
              ))}
            </select>
          </div>

          {/* Operator */}
          <div>
            <label className="text-[#555] text-xs mb-1 block">Operator</label>
            <select
              value={operatorFilter}
              onChange={(e) => { setOperatorFilter(e.target.value); setPage(1) }}
              className="w-full bg-[#141414] border border-[#2A2A2A] text-[#888] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#E5007E] cursor-pointer"
            >
              <option value="all">All operators</option>
              {operatorOptions.map(({ id, name }) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          {/* Price range */}
          <div>
            <label className="text-[#555] text-xs mb-1 block">Price range (€)</label>
            <div className="flex items-center gap-2">
              <input
                type="number" placeholder="Min" value={minPrice} min={0}
                onChange={(e) => { setMinPrice(e.target.value); setPage(1) }}
                className="w-full bg-[#141414] border border-[#2A2A2A] text-[#888] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#E5007E]"
              />
              <span className="text-[#444] text-sm">—</span>
              <input
                type="number" placeholder="Max" value={maxPrice} min={0}
                onChange={(e) => { setMaxPrice(e.target.value); setPage(1) }}
                className="w-full bg-[#141414] border border-[#2A2A2A] text-[#888] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#E5007E]"
              />
            </div>
          </div>

          {/* Date from */}
          <div>
            <label className="text-[#555] text-xs mb-1 block">From date</label>
            <input
              type="date" value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="w-full bg-[#141414] border border-[#2A2A2A] text-[#888] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#E5007E] cursor-pointer"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="text-[#555] text-xs mb-1 block">To date</label>
            <input
              type="date" value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="w-full bg-[#141414] border border-[#2A2A2A] text-[#888] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#E5007E] cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <ClockCounterClockwise size={48} weight="thin" color="#2A2A2A" />
          <p className="text-[#888888] text-base">No sessions yet.</p>
          <p className="text-[#2A2A2A] text-sm">Sessions will appear here after games are launched.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-[#888888]">No sessions match the current filters.</p>
          <button onClick={clearFilters} className="text-[#E5007E] text-sm hover:underline cursor-pointer">Clear filters</button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden mb-4">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto] gap-0 bg-white/[0.03] border-b border-white/[0.06]">
              {[
                { label: '#', col: null, cls: 'w-10 pl-4' },
                { label: 'Game', col: 'gameName' as SortKey, cls: '' },
                { label: 'Operator', col: 'operatorName' as SortKey, cls: '' },
                { label: 'Date', col: 'startTime' as SortKey, cls: '' },
                { label: 'Duration', col: 'duration' as SortKey, cls: '' },
                { label: 'Price', col: 'price' as SortKey, cls: '' },
                { label: 'Sync', col: null, cls: 'pr-4' },
              ].map(({ label, col, cls }) => (
                <div
                  key={label}
                  onClick={col ? () => toggleSort(col) : undefined}
                  className={`flex items-center gap-1 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[#555] ${col ? 'cursor-pointer hover:text-[#888] select-none' : ''} ${cls}`}
                >
                  {label}
                  {col && <SortIcon col={col} />}
                </div>
              ))}
            </div>

            {/* Rows */}
            {paginated.map((session, i) => (
              <div
                key={session.id}
                className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto] gap-0 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group"
              >
                {/* # */}
                <div className="flex items-center px-4 py-3">
                  <span className="text-[#333] text-xs">{(page - 1) * PAGE_SIZE + i + 1}</span>
                </div>

                {/* Game */}
                <div className="flex items-center gap-3 px-3 py-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-[#141414]">
                    <img src={session.poster} alt="" className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#F5F5F5] text-sm font-medium truncate">{session.gameName}</p>
                    {session.difficulty && (
                      <p className="text-[#444] text-xs capitalize">{session.difficulty}</p>
                    )}
                  </div>
                </div>

                {/* Operator */}
                <div className="flex items-center px-3 py-3">
                  <p className="text-[#888] text-sm truncate">{session.operatorName}</p>
                </div>

                {/* Date */}
                <div className="flex items-center px-3 py-3">
                  <p className="text-[#888] text-sm">{formatDate(session.startTime)}</p>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-1.5 px-3 py-3">
                  <Clock size={13} className="text-[#444] flex-shrink-0" weight="thin" />
                  <span className="text-[#888] text-sm">
                    {session.duration != null ? formatDuration(session.duration) : '—'}
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-1.5 px-3 py-3">
                  <Tag size={13} className="text-[#E5007E] flex-shrink-0" weight="thin" />
                  <span className="text-[#E5007E] text-sm font-semibold">€{session.price}</span>
                </div>

                {/* Sync */}
                <div className="flex items-center justify-center pr-4 py-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    title={session.syncStatus}
                    style={{ background: SYNC_COLORS[session.syncStatus] ?? '#444' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[#444] text-xs">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg text-[#555] hover:text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <CaretLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm transition-all cursor-pointer ${
                      p === page
                        ? 'bg-[#E5007E] text-white font-semibold'
                        : 'text-[#555] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg text-[#555] hover:text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <CaretRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
