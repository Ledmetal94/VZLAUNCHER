import { useState } from 'react'

export interface GameStat {
  slug: string
  name: string
  count: number
  revenue: number
  avgDuration: number  // seconds
}

interface Props {
  games: GameStat[]
}

type SortKey = 'count' | 'revenue' | 'avgDuration'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h ${m % 60}m` }
  return `${m}m ${String(seconds % 60).padStart(2, '0')}s`
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'count', label: 'Sessions' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'avgDuration', label: 'Avg Duration' },
]

const RANK_COLORS = ['#E5007E', '#7C6AF7', '#00E676', '#F59E0B', '#38BDF8', '#F97316']

export function GamePopularityChart({ games }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('count')

  const sorted = [...games].sort((a, b) => b[sortBy] - a[sortBy])
  const maxVal = sorted[0]?.[sortBy] ?? 1

  return (
    <div>
      {/* Sort toggle */}
      <div className="flex items-center gap-1 mb-5">
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              sortBy === key
                ? 'bg-[#E5007E] text-white'
                : 'text-[#555] hover:text-[#888]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {sorted.map((g, i) => {
          const pct = maxVal > 0 ? (g[sortBy] / maxVal) * 100 : 0
          const color = RANK_COLORS[i % RANK_COLORS.length]
          const displayVal = sortBy === 'count'
            ? `${g.count} session${g.count !== 1 ? 's' : ''}`
            : sortBy === 'revenue'
            ? `€${g.revenue}`
            : g.avgDuration > 0 ? formatDuration(g.avgDuration) : '—'

          return (
            <div key={g.slug} className="flex items-center gap-3">
              {/* Rank */}
              <span className="text-xs font-black w-4 text-right flex-shrink-0" style={{ color }}>
                {i + 1}
              </span>

              {/* Name */}
              <p className="text-[#F5F5F5] text-sm font-medium w-36 truncate flex-shrink-0">{g.name}</p>

              {/* Bar */}
              <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>

              {/* Value */}
              <span className="text-xs font-semibold w-24 text-right flex-shrink-0" style={{ color }}>
                {displayVal}
              </span>

              {/* Secondary stats */}
              <div className="flex items-center gap-3 flex-shrink-0 w-32 text-right">
                {sortBy !== 'count' && (
                  <span className="text-[#444] text-xs w-full text-right">{g.count} sessions</span>
                )}
                {sortBy !== 'revenue' && (
                  <span className="text-[#444] text-xs w-full text-right">€{g.revenue}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
