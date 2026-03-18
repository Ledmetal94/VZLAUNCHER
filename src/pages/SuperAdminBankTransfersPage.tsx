import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { SkeletonRow } from '@/components/ui/Skeleton'
import {
  getSuperAdminBankTransfers,
  confirmBankTransfer,
  rejectBankTransfer,
  type BankTransfer,
} from '@/services/cloudApi'

const STATUS_COLORS: Record<string, { label: string; color: string }> = {
  pending: { label: 'In attesa', color: '#f59e0b' },
  confirmed: { label: 'Confermato', color: '#44ff88' },
  failed: { label: 'Rifiutato', color: '#ff4444' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

type Filter = 'all' | 'pending' | 'confirmed' | 'failed'

export default function SuperAdminBankTransfersPage() {
  const navigate = useNavigate()
  const [transfers, setTransfers] = useState<BankTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(() => {
    setLoading(true)
    getSuperAdminBankTransfers()
      .then(setTransfers)
      .catch(() => toast.error('Errore caricamento bonifici'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const handleConfirm = async (id: string) => {
    setActionId(id)
    try {
      await confirmBankTransfer(id)
      toast.success('Bonifico confermato — gettoni accreditati')
      load()
    } catch {
      toast.error('Errore conferma bonifico')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (id: string) => {
    setActionId(id)
    try {
      await rejectBankTransfer(id)
      toast.success('Bonifico rifiutato')
      load()
    } catch {
      toast.error('Errore rifiuto bonifico')
    } finally {
      setActionId(null)
    }
  }

  const filtered = filter === 'all' ? transfers : transfers.filter((t) => t.status === filter)
  const pendingCount = transfers.filter((t) => t.status === 'pending').length

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? 'rgba(230,0,126,0.4)' : 'rgba(123,100,169,0.15)'}`,
    background: active ? 'rgba(230,0,126,0.12)' : 'rgba(255,255,255,0.03)',
    color: active ? '#E6007E' : 'rgba(255,255,255,0.4)',
    fontFamily: 'Outfit, sans-serif',
  })

  const btnStyle = (color: string, disabled: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: disabled ? 'wait' : 'pointer',
    border: `1px solid ${color}30`, background: `${color}12`, color,
    fontFamily: 'Outfit, sans-serif', opacity: disabled ? 0.5 : 1,
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
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Bonifici Bancari</h1>
            {pendingCount > 0 && (
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
              }}>
                {pendingCount} in attesa
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
          {(['all', 'pending', 'confirmed', 'failed'] as Filter[]).map((f) => (
            <button key={f} style={chipStyle(filter === f)} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Tutti' : STATUS_COLORS[f]?.label || f}
            </button>
          ))}
        </div>

        {/* Table */}
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
                {['Data', 'Sede', 'Importo', 'Riferimento', 'Stato', 'Azioni'].map((h) => (
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
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '8px 16px' }}><SkeletonRow /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>
                    Nessun bonifico trovato
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const statusInfo = STATUS_COLORS[t.status] || { label: t.status, color: 'rgba(255,255,255,0.5)' }
                  const busy = actionId === t.id
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.5)' }}>
                        {formatDate(t.created_at)}
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: 12 }}>
                        {t.venueName}
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: '#44ff88', fontVariantNumeric: 'tabular-nums' }}>
                        +{t.amount}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                        {t.payment_reference}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                          background: `${statusInfo.color}15`, color: statusInfo.color,
                        }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {t.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              disabled={busy}
                              onClick={() => handleConfirm(t.id)}
                              style={btnStyle('#44ff88', busy)}
                            >
                              Conferma
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => handleReject(t.id)}
                              style={btnStyle('#ff4444', busy)}
                            >
                              Rifiuta
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
