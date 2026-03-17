import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  getSuperAdminOperators, getSuperAdminVenues, createSuperAdminOperator, updateSuperAdminOperator,
  type SuperAdminOperator, type CloudVenue,
} from '@/services/cloudApi'

export default function SuperAdminOperatorsPage() {
  const navigate = useNavigate()
  const [operators, setOperators] = useState<SuperAdminOperator[]>([])
  const [venues, setVenues] = useState<CloudVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [venueFilter, setVenueFilter] = useState('')

  // Modal
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editOp, setEditOp] = useState<SuperAdminOperator | null>(null)
  const [form, setForm] = useState({ venue_id: '', name: '', username: '', password: '', role: 'normal' as 'admin' | 'normal' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadData = () => {
    setLoading(true)
    Promise.all([
      getSuperAdminOperators(venueFilter || undefined),
      getSuperAdminVenues(),
    ])
      .then(([ops, vs]) => { setOperators(ops); setVenues(vs) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [venueFilter])

  const closeModal = () => { setModal(null); setError(''); setEditOp(null) }

  const openCreate = () => {
    setForm({ venue_id: venueFilter || (venues[0]?.id ?? ''), name: '', username: '', password: '', role: 'normal' })
    setError('')
    setModal('create')
  }

  const openEdit = (op: SuperAdminOperator) => {
    setEditOp(op)
    setForm({ venue_id: op.venue_id, name: op.name, username: op.username, password: '', role: op.role })
    setError('')
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nome obbligatorio'); return }
    if (modal === 'create' && !form.password) { setError('Password obbligatoria'); return }
    if (modal === 'create' && !form.venue_id) { setError('Seleziona una sede'); return }
    setSaving(true)
    try {
      if (modal === 'create') {
        await createSuperAdminOperator(form)
      } else if (editOp) {
        const payload: Record<string, unknown> = { name: form.name, role: form.role, venue_id: form.venue_id }
        if (form.password) payload.password = form.password
        await updateSuperAdminOperator(editOp.id, payload as Parameters<typeof updateSuperAdminOperator>[1])
      }
      closeModal()
      loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (op: SuperAdminOperator) => {
    await updateSuperAdminOperator(op.id, { active: !op.active }).catch(() => {})
    loadData()
  }

  return (
    <div
      className="noise-overlay relative flex flex-col overflow-hidden"
      style={{ width: 1920, height: 1080, background: 'var(--color-surface)' }}
    >
      <div className="blob" style={{ width: 800, height: 800, filter: 'blur(160px)', background: 'rgba(82,49,137,0.18)', top: -300, left: -300 }} />
      <div className="blob" style={{ width: 600, height: 600, filter: 'blur(150px)', background: 'rgba(230,0,126,0.08)', bottom: -250, right: -200 }} />

      <div className="relative z-10 flex flex-1 flex-col min-h-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between" style={{ height: 56, padding: '0 32px', borderBottom: '1px solid rgba(123,100,169,0.12)', background: 'rgba(15,14,31,0.75)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/super-admin')} style={{ height: 36, borderRadius: 8, border: '1px solid rgba(123,100,169,0.18)', background: 'rgba(255,255,255,0.025)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Dashboard
            </button>
            <span style={{ fontSize: 20, fontWeight: 800 }}>Operatori</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(123,100,169,0.18)', background: 'rgba(255,255,255,0.03)', color: venueFilter ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, outline: 'none' }}
            >
              <option value="">Tutte le sedi</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <button onClick={openCreate} style={{ height: 36, borderRadius: 8, background: '#E6007E', border: 'none', cursor: 'pointer', padding: '0 16px', color: '#fff', fontSize: 12, fontWeight: 700 }}>
              + Nuovo operatore
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto" style={{ padding: '20px 32px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full"><span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Caricamento...</span></div>
          ) : operators.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.15)' }}>Nessun operatore</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.12)' }}>
                  {['Nome', 'Username', 'Sede', 'Ruolo', 'Stato', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr key={op.id} style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 700 }}>{op.name}</td>
                    <td style={{ padding: '12px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{op.username}</td>
                    <td style={{ padding: '12px', fontSize: 11, color: '#7B64A9' }}>{op.venueName}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6, background: op.role === 'admin' ? 'rgba(230,0,126,0.12)' : 'rgba(123,100,169,0.12)', color: op.role === 'admin' ? '#E6007E' : '#7B64A9', border: `1px solid ${op.role === 'admin' ? 'rgba(230,0,126,0.25)' : 'rgba(123,100,169,0.2)'}` }}>{op.role}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => toggleActive(op)} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${op.active ? 'rgba(68,255,136,0.25)' : 'rgba(255,68,68,0.2)'}`, background: op.active ? 'rgba(68,255,136,0.08)' : 'rgba(255,68,68,0.06)', color: op.active ? '#44ff88' : '#ff4444', textTransform: 'uppercase' }}>
                        {op.active ? 'Attivo' : 'Disattivo'}
                      </button>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => openEdit(op)} style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: '1px solid rgba(123,100,169,0.18)', background: 'rgba(255,255,255,0.025)', color: 'rgba(255,255,255,0.5)' }}>Modifica</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(10,8,30,0.92)', backdropFilter: 'blur(16px)' }} onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ width: 460, padding: '28px 34px', background: 'rgba(22,20,45,0.98)', border: '1px solid rgba(123,100,169,0.25)', borderRadius: 20, boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{modal === 'create' ? 'Nuovo operatore' : 'Modifica operatore'}</h2>
            {error && <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 16, background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', color: '#ff4444', fontSize: 12, fontWeight: 600 }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Sede</label>
                <select value={form.venue_id} onChange={(e) => setForm((f) => ({ ...f, venue_id: e.target.value }))} style={inputStyle}>
                  <option value="">Seleziona sede</option>
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Nome</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Username</label>
                  <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} style={inputStyle} disabled={modal === 'edit'} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{modal === 'edit' ? 'Nuova password (opz.)' : 'Password'}</label>
                  <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Ruolo</label>
                  <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'normal' }))} style={inputStyle}>
                    <option value="normal">Normal</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3" style={{ marginTop: 24 }}>
              <button onClick={closeModal} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(123,100,169,0.18)', background: 'rgba(255,255,255,0.025)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 24px', borderRadius: 8, background: saving ? 'rgba(230,0,126,0.5)' : '#E6007E', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Salvataggio...' : modal === 'create' ? 'Crea' : 'Salva'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(123,100,169,0.2)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, fontWeight: 500, outline: 'none', fontFamily: 'inherit' }
