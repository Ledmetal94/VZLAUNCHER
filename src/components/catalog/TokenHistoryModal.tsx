import { useState, useEffect, useCallback } from 'react'
import { CLOUD_URL } from '@/config/cloudUrl'
import { getAccessToken } from '@/services/cloudApi'

interface Transaction {
  id: string
  type: 'consume' | 'purchase' | 'adjustment' | 'correction' | 'refund' | 'bank_transfer'
  amount: number
  game_id?: string
  notes?: string
  payment_method?: string
  payment_reference?: string
  status: string
  created_at: string
}

interface ApiResponse {
  transactions: Transaction[]
  total: number
  page: number
  pageSize: number
}

interface TokenHistoryModalProps {
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  consume: 'Consumo',
  purchase: 'Acquisto',
  adjustment: 'Correzione',
  correction: 'Rimborso',
  refund: 'Storno',
  bank_transfer: 'Bonifico',
}

const TYPE_COLORS: Record<string, { bg: string; color: string; sign: string }> = {
  consume:      { bg: 'rgba(255,68,68,0.12)',    color: '#ff6b6b',  sign: '−' },
  purchase:     { bg: 'rgba(0,200,100,0.1)',     color: '#00d46a',  sign: '+' },
  adjustment:   { bg: 'rgba(100,180,255,0.12)',  color: '#64c8ff',  sign: '±' },
  correction:   { bg: 'rgba(245,158,11,0.12)',   color: '#f59e0b',  sign: '+' },
  refund:       { bg: 'rgba(245,158,11,0.12)',   color: '#f59e0b',  sign: '−' },
  bank_transfer: { bg: 'rgba(0,200,100,0.1)',    color: '#00d46a',  sign: '+' },
}

const TYPE_FILTERS = [
  { value: '', label: 'Tutti' },
  { value: 'consume', label: 'Consumi' },
  { value: 'purchase', label: 'Acquisti' },
  { value: 'bank_transfer', label: 'Bonifici' },
  { value: 'correction', label: 'Rimborsi' },
  { value: 'refund', label: 'Storni' },
  { value: 'adjustment', label: 'Correzioni' },
]

const PAGE_SIZE = 20

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TokenHistoryModal({ onClose }: TokenHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchTransactions = useCallback(async (p: number, type: string) => {
    setLoading(true)
    setError(null)
    try {
      const token = getAccessToken()
      if (!token) { setError('Non autenticato'); return }

      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) })
      if (type) params.set('type', type)

      const res = await fetch(`${CLOUD_URL}/api/v1/admin/tokens/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error?.message || `Errore ${res.status}`)
        return
      }

      const data: ApiResponse = await res.json()
      setTransactions(data.transactions)
      setTotal(data.total)
    } catch {
      setError('Impossibile caricare lo storico — controlla la connessione')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions(page, typeFilter)
  }, [fetchTransactions, page, typeFilter])

  function handleTypeChange(type: string) {
    setTypeFilter(type)
    setPage(1)
  }

  return (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(10,8,30,0.92)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: 780,
          maxHeight: 620,
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 34px',
          background: 'rgba(22,20,45,0.98)',
          border: '1px solid rgba(123,100,169,0.25)',
          borderRadius: 20,
          boxShadow: '0 40px 100px rgba(0,0,0,0.6),0 0 80px rgba(82,49,137,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 18, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Storico gettoni</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {total > 0 ? `${total} transazioni totali` : 'Nessuna transazione'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex', gap: 4, marginBottom: 14, flexShrink: 0,
            background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3,
          }}
        >
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleTypeChange(f.value)}
              style={{
                flex: 1, padding: '6px 0', border: 'none', borderRadius: 6,
                fontFamily: 'Outfit, sans-serif', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: typeFilter === f.value ? 'rgba(82,49,137,0.45)' : 'transparent',
                color: typeFilter === f.value ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              Caricamento...
            </div>
          )}
          {error && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#ff6b6b', fontSize: 13 }}>
              {error}
            </div>
          )}
          {!loading && !error && transactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              Nessuna transazione trovata
            </div>
          )}
          {!loading && !error && transactions.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 3px' }}>
              <thead>
                <tr>
                  {['Data', 'Tipo', 'Importo', 'Dettaglio', 'Stato'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left', fontSize: 9, fontWeight: 700,
                        letterSpacing: '.12em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.25)', paddingBottom: 8,
                        paddingLeft: h === 'Data' ? 0 : 8,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const style = TYPE_COLORS[tx.type] ?? TYPE_COLORS.adjustment
                  const isPositive = ['purchase', 'bank_transfer', 'correction', 'adjustment'].includes(tx.type)
                  const sign = style.sign
                  const displayAmount = tx.amount < 0 ? Math.abs(tx.amount) : tx.amount

                  return (
                    <tr key={tx.id}>
                      <td style={{ padding: '8px 8px 8px 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                        {formatDate(tx.created_at)}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: 10, fontWeight: 700,
                          background: style.bg, color: style.color,
                        }}>
                          {TYPE_LABELS[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: isPositive ? '#00d46a' : '#ff6b6b',
                        }}>
                          {sign}{displayAmount.toLocaleString('it-IT')}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontSize: 11, color: 'rgba(255,255,255,0.38)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.notes || tx.payment_reference || (tx.game_id ? `Gioco: ${tx.game_id.slice(0, 8)}` : '—')}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: tx.status === 'confirmed' ? 'rgba(0,212,106,0.7)' : tx.status === 'failed' ? '#ff6b6b' : 'rgba(255,255,255,0.3)',
                        }}>
                          {tx.status === 'confirmed' ? 'Confermato' : tx.status === 'failed' ? 'Fallito' : tx.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between"
            style={{ marginTop: 14, flexShrink: 0, paddingTop: 12, borderTop: '1px solid rgba(123,100,169,0.1)' }}
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(123,100,169,0.2)',
                background: 'rgba(255,255,255,0.03)', color: page <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                fontSize: 11, fontWeight: 600, cursor: page <= 1 ? 'default' : 'pointer',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              ← Precedente
            </button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              Pagina {page} di {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(123,100,169,0.2)',
                background: 'rgba(255,255,255,0.03)', color: page >= totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                fontSize: 11, fontWeight: 600, cursor: page >= totalPages ? 'default' : 'pointer',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              Successiva →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
