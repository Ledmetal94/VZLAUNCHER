import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { SkeletonRow } from '@/components/ui/Skeleton'
import { getAuditLogs, type AuditLog } from '@/services/cloudApi'

const ACTION_COLORS: Record<string, { label: string; color: string }> = {
  login: { label: 'Login', color: '#64c8ff' },
  token_credit: { label: 'Credito gettoni', color: '#44ff88' },
  bank_transfer_confirm: { label: 'Bonifico OK', color: '#44ff88' },
  bank_transfer_reject: { label: 'Bonifico rifiutato', color: '#ff4444' },
  venue_status_change: { label: 'Stato sede', color: '#f59e0b' },
  operator_create: { label: 'Nuovo operatore', color: '#a78bfa' },
  operator_update: { label: 'Modifica operatore', color: '#a78bfa' },
  game_toggle: { label: 'Giochi sede', color: '#E6007E' },
}

const ACTION_OPTIONS = [
  { value: '', label: 'Tutte le azioni' },
  { value: 'login', label: 'Login' },
  { value: 'token_credit', label: 'Credito gettoni' },
  { value: 'bank_transfer_confirm', label: 'Bonifico confermato' },
  { value: 'bank_transfer_reject', label: 'Bonifico rifiutato' },
  { value: 'venue_status_change', label: 'Cambio stato sede' },
]

const RANGE_OPTIONS = [
  { label: 'Tutto', days: -1 },
  { label: 'Oggi', days: 0 },
  { label: '7g', days: 7 },
  { label: '30g', days: 30 },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function SuperAdminAuditLogPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(-1)
  const [actionFilter, setActionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const pageSize = 25

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let active = true
    setLoading(true)

    const filters: { action?: string; startDate?: string; endDate?: string; search?: string } = {}
    if (actionFilter) filters.action = actionFilter
    if (searchDebounced) filters.search = searchDebounced
    if (rangeDays >= 0) {
      filters.endDate = new Date().toISOString().split('T')[0]
      filters.startDate = rangeDays === 0
        ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString().split('T')[0]
        : new Date(Date.now() - rangeDays * 86400000).toISOString().split('T')[0]
    }

    getAuditLogs(page, pageSize, filters)
      .then((res) => { if (active) { setLogs(res.logs); setTotal(res.total) } })
      .catch(() => { if (active) setLogs([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, rangeDays, actionFilter, searchDebounced])

  const totalPages = Math.ceil(total / pageSize)

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? 'rgba(230,0,126,0.4)' : 'rgba(123,100,169,0.15)'}`,
    background: active ? 'rgba(230,0,126,0.12)' : 'rgba(255,255,255,0.03)',
    color: active ? '#E6007E' : 'rgba(255,255,255,0.4)', fontFamily: 'Outfit, sans-serif',
  })

  const selectStyle: React.CSSProperties = {
    padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(123,100,169,0.15)',
    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)',
    fontSize: 11, fontWeight: 600, fontFamily: 'Outfit, sans-serif', outline: 'none',
  }

  return (
    <div className="noise-overlay relative flex flex-col overflow-hidden" style={{ width: 1920, height: 1080, background: 'var(--color-surface)', fontFamily: 'Outfit, sans-serif' }}>
      <div className="blob" style={{ width: 800, height: 800, filter: 'blur(160px)', background: 'rgba(82,49,137,0.18)', top: -300, left: -300 }} />
      <div className="blob" style={{ width: 600, height: 600, filter: 'blur(150px)', background: 'rgba(230,0,126,0.08)', bottom: -250, right: -200 }} />

      <div className="relative z-10 flex flex-1 flex-col min-h-0 p-8">
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/super-admin')} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(123,100,169,0.18)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Audit Log</h1>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{total} eventi</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
          {RANGE_OPTIONS.map((r) => (
            <button key={r.days} style={chipStyle(rangeDays === r.days)} onClick={() => { setRangeDays(r.days); setPage(1) }}>{r.label}</button>
          ))}
          <div style={{ width: 1, height: 20, background: 'rgba(123,100,169,0.12)', margin: '0 6px' }} />
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1) }} style={selectStyle}>
            {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Cerca attore/target..."
            style={{ ...selectStyle, width: 200 }}
          />
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto" style={{ borderRadius: 16, border: '1px solid rgba(123,100,169,0.12)', background: 'rgba(22,20,45,0.6)', backdropFilter: 'blur(12px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.1)' }}>
                {['Data', 'Attore', 'Azione', 'Target', 'Dettagli'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', position: 'sticky', top: 0, background: 'rgba(22,20,45,0.95)', backdropFilter: 'blur(12px)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={5} style={{ padding: '8px 16px' }}><SkeletonRow /></td></tr>)
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>Nessun evento trovato</td></tr>
              ) : (
                logs.map((log) => {
                  const actionInfo = ACTION_COLORS[log.action] || { label: log.action, color: 'rgba(255,255,255,0.5)' }
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>{log.actor_name || log.actor_id?.slice(0, 8) || 'Sistema'}</span>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginLeft: 6 }}>{log.actor_type}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${actionInfo.color}15`, color: actionInfo.color }}>{actionInfo.label}</span>
                      </td>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                        {log.target_name || log.target_id?.slice(0, 8) || '—'}
                        {log.target_type && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>({log.target_type})</span>}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 10, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2" style={{ marginTop: 16 }}>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ ...chipStyle(false), opacity: page <= 1 ? 0.3 : 1, cursor: page <= 1 ? 'default' : 'pointer' }}>← Prec</button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', padding: '0 8px' }}>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ ...chipStyle(false), opacity: page >= totalPages ? 0.3 : 1, cursor: page >= totalPages ? 'default' : 'pointer' }}>Succ →</button>
          </div>
        )}
      </div>
    </div>
  )
}
