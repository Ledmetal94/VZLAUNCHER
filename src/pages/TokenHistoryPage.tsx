import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { SkeletonRow } from '@/components/ui/Skeleton'
import { getTokenTransactions, type TokenTransaction } from '@/services/cloudApi'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  purchase: { label: 'Acquisto', color: '#44ff88' },
  consume: { label: 'Consumo', color: '#ff6b6b' },
  adjustment: { label: 'Correzione', color: '#64c8ff' },
  refund: { label: 'Rimborso', color: '#f59e0b' },
}

const METHOD_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  bank_transfer: 'Bonifico',
  manual: 'Manuale',
}

const RANGE_OPTIONS = [
  { label: 'Tutto', days: -1 },
  { label: 'Oggi', days: 0 },
  { label: '7g', days: 7 },
  { label: '30g', days: 30 },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Tutti' },
  { value: 'purchase', label: 'Acquisti' },
  { value: 'consume', label: 'Consumi' },
  { value: 'adjustment', label: 'Correzioni' },
  { value: 'refund', label: 'Rimborsi' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseGameFromRef(ref: string | null): string {
  if (!ref) return '—'
  const match = ref.match(/game:([^;]+)/)
  return match ? match[1] : ref.slice(0, 20)
}

export default function TokenHistoryPage() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(-1)
  const [typeFilter, setTypeFilter] = useState('')
  const pageSize = 20

  useEffect(() => {
    let active = true
    setLoading(true)

    const filters: { type?: string; startDate?: string; endDate?: string } = {}
    if (typeFilter) filters.type = typeFilter
    if (rangeDays >= 0) {
      filters.endDate = new Date().toISOString().split('T')[0]
      filters.startDate = rangeDays === 0
        ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString().split('T')[0]
        : new Date(Date.now() - rangeDays * 86400000).toISOString().split('T')[0]
    }

    getTokenTransactions(page, pageSize, filters)
      .then((res) => {
        if (active) {
          setTransactions(res.transactions)
          setTotal(res.total)
        }
      })
      .catch(() => {
        if (active) setTransactions([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [page, rangeDays, typeFilter])

  const totalPages = Math.ceil(total / pageSize)

  // Shared styles
  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px',
    borderRadius: 8,
    border: `1px solid ${active ? 'rgba(230,0,126,0.4)' : 'rgba(123,100,169,0.15)'}`,
    background: active ? 'rgba(230,0,126,0.12)' : 'rgba(255,255,255,0.03)',
    color: active ? '#E6007E' : 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
  })

  const selectStyle: React.CSSProperties = {
    padding: '5px 10px',
    borderRadius: 8,
    border: '1px solid rgba(123,100,169,0.15)',
    background: 'rgba(255,255,255,0.03)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'Outfit, sans-serif',
    outline: 'none',
  }

  return (
    <div
      className="noise-overlay relative flex flex-col overflow-hidden"
      style={{ width: 1920, height: 1080, background: 'var(--color-surface)', fontFamily: 'Outfit, sans-serif' }}
    >
      {/* Ambient blobs */}
      <div className="blob" style={{ width: 800, height: 800, filter: 'blur(160px)', background: 'rgba(82,49,137,0.18)', top: -300, left: -300 }} />
      <div className="blob" style={{ width: 600, height: 600, filter: 'blur(150px)', background: 'rgba(230,0,126,0.08)', bottom: -250, right: -200 }} />

      <div className="relative z-10 flex flex-1 flex-col min-h-0 p-8">
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: '1px solid rgba(123,100,169,0.18)',
                background: 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Storico Gettoni</h1>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
              {total} transazioni
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.days}
              style={chipStyle(rangeDays === r.days)}
              onClick={() => { setRangeDays(r.days); setPage(1) }}
            >
              {r.label}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: 'rgba(123,100,169,0.12)', margin: '0 6px' }} />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            style={selectStyle}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div
          className="flex-1 min-h-0 overflow-auto"
          style={{
            borderRadius: 16,
            border: '1px solid rgba(123,100,169,0.12)',
            background: 'rgba(22,20,45,0.6)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.1)' }}>
                {['Data', 'Tipo', 'Importo', 'Metodo', 'Riferimento', 'Stato'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.3)',
                      position: 'sticky',
                      top: 0,
                      background: 'rgba(22,20,45,0.95)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} style={{ padding: '8px 16px' }}><SkeletonRow /></td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>
                    Nessuna transazione trovata
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const typeInfo = TYPE_LABELS[tx.type] || { label: tx.type, color: 'rgba(255,255,255,0.5)' }
                  const isPositive = tx.amount > 0
                  return (
                    <tr
                      key={tx.id}
                      style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}
                    >
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.5)' }}>
                        {formatDate(tx.created_at)}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            background: `${typeInfo.color}15`,
                            color: typeInfo.color,
                          }}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: isPositive ? '#44ff88' : '#ff6b6b',
                        }}
                      >
                        {isPositive ? '+' : ''}{tx.amount}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.4)' }}>
                        {tx.payment_method ? (METHOD_LABELS[tx.payment_method] || tx.payment_method) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                        {tx.type === 'consume' ? parseGameFromRef(tx.payment_reference) : (tx.payment_reference?.slice(0, 24) || '—')}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: tx.status === 'confirmed' ? '#44ff88'
                              : tx.status === 'failed' ? '#ff4444'
                              : '#f59e0b',
                          }}
                        >
                          {tx.status === 'confirmed' ? 'Confermato' : tx.status === 'failed' ? 'Fallito' : 'In attesa'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2" style={{ marginTop: 16 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{
                ...chipStyle(false),
                opacity: page <= 1 ? 0.3 : 1,
                cursor: page <= 1 ? 'default' : 'pointer',
              }}
            >
              ← Prec
            </button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', padding: '0 8px' }}>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              style={{
                ...chipStyle(false),
                opacity: page >= totalPages ? 0.3 : 1,
                cursor: page >= totalPages ? 'default' : 'pointer',
              }}
            >
              Succ →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
