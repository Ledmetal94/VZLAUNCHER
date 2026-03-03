import { useState } from 'react'

export interface DayDataPoint {
  label: string   // e.g. "12/03"
  sessions: number
  revenue: number
}

interface Props {
  data: DayDataPoint[]
}

const W = 600
const H = 180
const PAD = { top: 16, right: 16, bottom: 32, left: 40 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

function polyline(points: [number, number][]) {
  return points.map(([x, y]) => `${x},${y}`).join(' ')
}

function smoothPath(points: [number, number][]) {
  if (points.length < 2) return ''
  let d = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]
    const [x1, y1] = points[i]
    const cx = (x0 + x1) / 2
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`
  }
  return d
}

export function TimeSeriesChart({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: DayDataPoint } | null>(null)
  const [activeMetric, setActiveMetric] = useState<'both' | 'sessions' | 'revenue'>('both')

  if (data.length === 0) return null

  const maxSessions = Math.max(...data.map((d) => d.sessions), 1)
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * INNER_W
  const yScaleSessions = (v: number) => PAD.top + INNER_H - (v / maxSessions) * INNER_H
  const yScaleRevenue = (v: number) => PAD.top + INNER_H - (v / maxRevenue) * INNER_H

  const sessionPts: [number, number][] = data.map((d, i) => [xScale(i), yScaleSessions(d.sessions)])
  const revenuePts: [number, number][] = data.map((d, i) => [xScale(i), yScaleRevenue(d.revenue)])

  const sessionArea = smoothPath(sessionPts) + ` L ${sessionPts[sessionPts.length - 1][0]} ${PAD.top + INNER_H} L ${sessionPts[0][0]} ${PAD.top + INNER_H} Z`
  const revenueArea = smoothPath(revenuePts) + ` L ${revenuePts[revenuePts.length - 1][0]} ${PAD.top + INNER_H} L ${revenuePts[0][0]} ${PAD.top + INNER_H} Z`

  // Y-axis ticks (4 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.top + INNER_H - t * INNER_H,
    labelSessions: Math.round(t * maxSessions),
    labelRevenue: Math.round(t * maxRevenue),
  }))

  // X labels — show every other label if many points
  const step = data.length > 10 ? 2 : 1

  return (
    <div className="w-full">
      {/* Legend toggles */}
      <div className="flex items-center gap-4 mb-4">
        {[
          { key: 'sessions', color: '#E5007E', label: 'Sessions' },
          { key: 'revenue', color: '#00E676', label: 'Revenue (€)' },
        ].map(({ key, color, label }) => (
          <button
            key={key}
            onClick={() => setActiveMetric((prev) => prev === key ? 'both' : key as 'sessions' | 'revenue')}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <span
              className="w-3 h-3 rounded-full transition-opacity"
              style={{
                background: color,
                opacity: activeMetric === 'both' || activeMetric === key ? 1 : 0.2,
              }}
            />
            <span
              className="text-xs transition-colors"
              style={{ color: activeMetric === 'both' || activeMetric === key ? '#888' : '#333' }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 180 }}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E5007E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#E5007E" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E676" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map(({ y }, i) => (
            <line key={i} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}

          {/* Y-axis labels (sessions left) */}
          {(activeMetric === 'both' || activeMetric === 'sessions') && yTicks.map(({ y, labelSessions }, i) => (
            <text key={i} x={PAD.left - 6} y={y + 4} textAnchor="end"
              fontSize="9" fill="#444">{labelSessions}</text>
          ))}

          {/* Areas */}
          {(activeMetric === 'both' || activeMetric === 'sessions') && (
            <path d={sessionArea} fill="url(#gradSessions)" />
          )}
          {(activeMetric === 'both' || activeMetric === 'revenue') && (
            <path d={revenueArea} fill="url(#gradRevenue)" />
          )}

          {/* Lines */}
          {(activeMetric === 'both' || activeMetric === 'sessions') && (
            <path d={smoothPath(sessionPts)} fill="none" stroke="#E5007E" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          )}
          {(activeMetric === 'both' || activeMetric === 'revenue') && (
            <path d={smoothPath(revenuePts)} fill="none" stroke="#00E676" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Hover areas + dots */}
          {data.map((d, i) => {
            const x = xScale(i)
            const ySess = yScaleSessions(d.sessions)
            const yRev = yScaleRevenue(d.revenue)
            return (
              <g key={i}>
                <rect
                  x={x - (INNER_W / data.length) / 2} y={PAD.top}
                  width={INNER_W / data.length} height={INNER_H}
                  fill="transparent"
                  onMouseEnter={() => setTooltip({ x, y: Math.min(ySess, yRev), d })}
                />
                {tooltip?.d === d && (
                  <>
                    <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + INNER_H}
                      stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
                    {(activeMetric === 'both' || activeMetric === 'sessions') && (
                      <circle cx={x} cy={ySess} r="4" fill="#E5007E" />
                    )}
                    {(activeMetric === 'both' || activeMetric === 'revenue') && (
                      <circle cx={x} cy={yRev} r="4" fill="#00E676" />
                    )}
                  </>
                )}
              </g>
            )
          })}

          {/* X-axis labels */}
          {data.map((d, i) => (
            i % step === 0 && (
              <text key={i} x={xScale(i)} y={H - 6} textAnchor="middle"
                fontSize="9" fill="#444">{d.label}</text>
            )
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none px-3 py-2 rounded-xl bg-[#1A1A2E] border border-white/[0.1] text-xs shadow-xl"
            style={{
              left: `${(tooltip.x / W) * 100}%`,
              top: 0,
              transform: 'translateX(-50%)',
              minWidth: 110,
            }}
          >
            <p className="text-[#888] mb-1">{tooltip.d.label}</p>
            <p className="text-[#E5007E] font-semibold">{tooltip.d.sessions} session{tooltip.d.sessions !== 1 ? 's' : ''}</p>
            <p className="text-[#00E676] font-semibold">€{tooltip.d.revenue}</p>
          </div>
        )}
      </div>
    </div>
  )
}
