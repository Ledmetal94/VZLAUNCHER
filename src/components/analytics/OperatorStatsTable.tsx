export interface OperatorStat {
  id: string
  name: string
  count: number
  revenue: number
  avgDuration: number  // seconds
}

interface Props {
  operators: OperatorStat[]
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h ${m % 60}m` }
  return `${m}m ${String(seconds % 60).padStart(2, '0')}s`
}

const ROW_COLORS = ['#E5007E', '#7C6AF7', '#00E676', '#F59E0B', '#38BDF8']

export function OperatorStatsTable({ operators }: Props) {
  if (operators.length === 0) return <p className="text-[#555] text-sm py-4">No operator data</p>

  const maxCount = operators[0].count

  return (
    <div className="space-y-3">
      {operators.map((op, i) => {
        const color = ROW_COLORS[i % ROW_COLORS.length]
        const pct = maxCount > 0 ? (op.count / maxCount) * 100 : 0
        return (
          <div key={op.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black" style={{ color }}>{i + 1}</span>
                <p className="text-[#F5F5F5] text-sm font-medium">{op.name}</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-[#888]">{op.avgDuration > 0 ? formatDuration(op.avgDuration) : '—'} avg</span>
                <span className="text-[#00E676] font-semibold">€{op.revenue}</span>
                <span className="font-semibold" style={{ color }}>{op.count} sessions</span>
              </div>
            </div>
            <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
