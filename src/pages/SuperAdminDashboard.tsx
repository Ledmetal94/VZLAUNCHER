import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '@/store/authStore'
import { logout as cloudLogout } from '@/services/cloudApi'
import {
  getCrossVenueAnalytics,
  getSuperAdminVenues,
  createVenue,
  updateVenue,
  creditVenueTokens,
  type CrossVenueAnalytics,
  type CloudVenue,
  type CreateVenuePayload,
} from '@/services/cloudApi'

const RANGE_OPTIONS = [
  { label: '7g', days: 7 },
  { label: '30g', days: 30 },
  { label: '90g', days: 90 },
]

const STATUS_COLORS: Record<string, string> = {
  active: '#44ff88',
  suspended: '#ff4444',
  onboarding: '#ffaa00',
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [tab, setTab] = useState<'overview' | 'venues'>('overview')
  const [analytics, setAnalytics] = useState<CrossVenueAnalytics | null>(null)
  const [venues, setVenues] = useState<CloudVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(30)

  // Modal state
  const [modal, setModal] = useState<'create' | 'edit' | 'credit' | null>(null)
  const [editVenue, setEditVenue] = useState<CloudVenue | null>(null)
  const [form, setForm] = useState<CreateVenuePayload>({ name: '' })
  const [creditAmount, setCreditAmount] = useState(0)
  const [creditReason, setCreditReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadData = () => {
    setLoading(true)
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - rangeDays * 86400000).toISOString()

    Promise.all([
      getCrossVenueAnalytics(startDate, endDate),
      getSuperAdminVenues(),
    ])
      .then(([a, v]) => { setAnalytics(a); setVenues(v) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [rangeDays])

  const handleLogout = async () => {
    await cloudLogout().catch(() => {})
    logout()
    navigate('/super-admin/login', { replace: true })
  }

  const closeModal = () => { setModal(null); setError(''); setEditVenue(null) }

  const openCreate = () => {
    setForm({ name: '', address: '', contact_email: '', status: 'active', default_token_cost: 1 })
    setError('')
    setModal('create')
  }

  const openEdit = (v: CloudVenue) => {
    setEditVenue(v)
    setForm({
      name: v.name,
      address: v.address || '',
      contact_email: v.contact_email || '',
      status: v.status,
      default_token_cost: v.default_token_cost,
      logo_url: v.logo_url || '',
    })
    setError('')
    setModal('edit')
  }

  const openCredit = (v: CloudVenue) => {
    setEditVenue(v)
    setCreditAmount(100)
    setCreditReason('')
    setError('')
    setModal('credit')
  }

  const handleSaveVenue = async () => {
    if (!form.name?.trim()) { setError('Nome obbligatorio'); return }
    setSaving(true)
    try {
      if (modal === 'create') {
        await createVenue(form)
      } else if (editVenue) {
        await updateVenue(editVenue.id, form)
      }
      closeModal()
      loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  const handleCredit = async () => {
    if (!editVenue || creditAmount === 0) return
    setSaving(true)
    try {
      await creditVenueTokens(editVenue.id, creditAmount, creditReason || undefined)
      closeModal()
      loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  const kpis = analytics?.kpis
  const dailyData = (analytics?.daily || []).map((d) => ({ ...d, label: d.date.slice(5) }))

  return (
    <div
      className="noise-overlay relative flex flex-col overflow-hidden"
      style={{ width: 1920, height: 1080, background: 'var(--color-surface)' }}
    >
      <div className="blob" style={{ width: 800, height: 800, filter: 'blur(160px)', background: 'rgba(82,49,137,0.18)', top: -300, left: -300 }} />
      <div className="blob" style={{ width: 600, height: 600, filter: 'blur(150px)', background: 'rgba(230,0,126,0.08)', bottom: -250, right: -200 }} />

      <div className="relative z-10 flex flex-1 flex-col min-h-0">
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between"
          style={{
            height: 56, padding: '0 32px',
            borderBottom: '1px solid rgba(123,100,169,0.12)',
            background: 'rgba(15,14,31,0.75)', backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-4">
            <span style={{ fontSize: 20, fontWeight: 800 }}>Super Admin</span>
            <div className="flex gap-1" style={{ marginLeft: 16 }}>
              {(['overview', 'venues'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${tab === t ? 'rgba(230,0,126,0.5)' : 'rgba(123,100,169,0.15)'}`,
                    background: tab === t ? 'rgba(230,0,126,0.12)' : 'transparent',
                    color: tab === t ? '#E6007E' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {t === 'overview' ? 'Panoramica' : 'Sedi'}
                </button>
              ))}
              <button
                onClick={() => navigate('/super-admin/operators')}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid rgba(123,100,169,0.15)',
                  background: 'transparent', color: 'rgba(255,255,255,0.4)',
                }}
              >
                Operatori
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setRangeDays(opt.days)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${rangeDays === opt.days ? 'rgba(230,0,126,0.5)' : 'rgba(123,100,169,0.15)'}`,
                  background: rangeDays === opt.days ? 'rgba(230,0,126,0.12)' : 'transparent',
                  color: rangeDays === opt.days ? '#E6007E' : 'rgba(255,255,255,0.4)',
                }}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                border: '1px solid rgba(255,68,68,0.2)', background: 'rgba(255,68,68,0.06)', color: '#ff4444',
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto" style={{ padding: '24px 32px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Caricamento...</span>
            </div>
          ) : tab === 'overview' ? (
            <div className="flex flex-col gap-5">
              {/* KPIs */}
              <div className="grid grid-cols-4 gap-4">
                <KpiCard label="Sedi totali" value={kpis?.totalVenues ?? 0} />
                <KpiCard label="Sedi attive" value={kpis?.activeVenues ?? 0} color="#44ff88" />
                <KpiCard label="Sessioni totali" value={kpis?.totalSessions ?? 0} />
                <KpiCard label="Gettoni consumati" value={kpis?.totalTokens ?? 0} accent />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <KpiCard label="Giocatori totali" value={kpis?.totalPlayers ?? 0} />
                <KpiCard label="Sessioni completate" value={kpis?.completedSessions ?? 0} color="#44ff88" />
                <KpiCard label="Durata media" value={formatDuration(kpis?.avgDuration ?? 0)} />
              </div>

              {/* Chart + Venue ranking */}
              <div className="grid grid-cols-3 gap-4" style={{ height: 260 }}>
                <div className="col-span-2" style={{ background: 'rgba(22,20,45,0.6)', border: '1px solid rgba(123,100,169,0.12)', borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Sessioni giornaliere (tutte le sedi)</span>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    {dailyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                          <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={{ stroke: 'rgba(123,100,169,0.12)' }} tickLine={false} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="sessions" fill="#E6007E" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full"><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Nessun dato</span></div>
                    )}
                  </div>
                </div>

                {/* Venue ranking */}
                <div style={{ background: 'rgba(22,20,45,0.6)', border: '1px solid rgba(123,100,169,0.12)', borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Classifica sedi</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', overflow: 'auto' }}>
                    {(analytics?.venueBreakdown || [])
                      .sort((a, b) => b.sessions - a.sessions)
                      .slice(0, 8)
                      .map((v, i) => (
                        <div key={v.venueId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#E6007E', width: 16 }}>{i + 1}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{v.venueName}</span>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{v.sessions} sess</span>
                        </div>
                      ))}
                    {(analytics?.venueBreakdown || []).length === 0 && (
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>Nessun dato</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Venue breakdown table */}
              <div style={{ background: 'rgba(22,20,45,0.6)', border: '1px solid rgba(123,100,169,0.12)', borderRadius: 16, padding: '16px 20px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Dettaglio sedi</span>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.12)' }}>
                      {['Sede', 'Stato', 'Saldo gettoni', 'Sessioni', 'Gettoni usati', 'Giocatori'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.venueBreakdown || []).map((v) => (
                      <tr key={v.venueId} style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>{v.venueName}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: STATUS_COLORS[v.status] || '#fff', letterSpacing: '.06em' }}>{v.status}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#E6007E' }}>{v.tokenBalance.toLocaleString('it-IT')}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600 }}>{v.sessions}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{v.tokens}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{v.players}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Venues tab */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 16, fontWeight: 800 }}>Gestione sedi</span>
                <button onClick={openCreate} style={{ height: 36, borderRadius: 8, background: '#E6007E', border: 'none', cursor: 'pointer', padding: '0 16px', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  + Nuova sede
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.12)' }}>
                    {['Nome', 'Indirizzo', 'Email', 'Stato', 'Gettoni', 'Operatori', ''].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {venues.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}>
                      <td style={{ padding: '12px', fontSize: 13, fontWeight: 700 }}>{v.name}</td>
                      <td style={{ padding: '12px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{v.address || '—'}</td>
                      <td style={{ padding: '12px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{v.contact_email || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6, color: STATUS_COLORS[v.status] || '#fff', background: `${STATUS_COLORS[v.status] || '#fff'}15`, border: `1px solid ${STATUS_COLORS[v.status] || '#fff'}40` }}>{v.status}</span>
                      </td>
                      <td style={{ padding: '12px', fontSize: 13, fontWeight: 700, color: '#E6007E' }}>{v.token_balance.toLocaleString('it-IT')}</td>
                      <td style={{ padding: '12px', fontSize: 12, fontWeight: 600 }}>{v.operatorCount}</td>
                      <td style={{ padding: '12px' }}>
                        <div className="flex gap-2">
                          <Btn onClick={() => openEdit(v)}>Modifica</Btn>
                          <Btn onClick={() => openCredit(v)} accent>Gettoni</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {venues.length === 0 && (
                <div className="flex items-center justify-center" style={{ padding: 40 }}>
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14 }}>Nessuna sede</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Venue create/edit modal */}
      {(modal === 'create' || modal === 'edit') && (
        <ModalOverlay onClose={closeModal}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
            {modal === 'create' ? 'Nuova sede' : 'Modifica sede'}
          </h2>
          {error && <ErrorBanner msg={error} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Nome">
              <input value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Nome sede" />
            </Field>
            <Field label="Indirizzo">
              <input value={form.address || ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} style={inputStyle} placeholder="Indirizzo" />
            </Field>
            <Field label="Email contatto">
              <input value={form.contact_email || ''} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} style={inputStyle} placeholder="email@example.com" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Stato">
                <select value={form.status || 'active'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={inputStyle}>
                  <option value="active">Attiva</option>
                  <option value="suspended">Sospesa</option>
                  <option value="onboarding">Onboarding</option>
                </select>
              </Field>
              <Field label="Costo gettoni default">
                <input type="number" value={form.default_token_cost ?? 1} onChange={(e) => setForm((f) => ({ ...f, default_token_cost: +e.target.value }))} style={inputStyle} min={0} max={100} />
              </Field>
            </div>
          </div>
          <ModalActions onCancel={closeModal} onSave={handleSaveVenue} saving={saving} label={modal === 'create' ? 'Crea sede' : 'Salva'} />
        </ModalOverlay>
      )}

      {/* Credit modal */}
      {modal === 'credit' && editVenue && (
        <ModalOverlay onClose={closeModal}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Credita gettoni</h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>{editVenue.name} — Saldo: {editVenue.token_balance.toLocaleString('it-IT')}</p>
          {error && <ErrorBanner msg={error} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Quantità">
              <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(+e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Motivo (opzionale)">
              <input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} style={inputStyle} placeholder="Motivo del credito" />
            </Field>
          </div>
          <ModalActions onCancel={closeModal} onSave={handleCredit} saving={saving} label={`Credita ${creditAmount > 0 ? '+' : ''}${creditAmount}`} />
        </ModalOverlay>
      )}
    </div>
  )
}

/* ─── Shared components ──────────────────────────────────── */

function KpiCard({ label, value, accent, color }: { label: string; value: string | number; accent?: boolean; color?: string }) {
  return (
    <div style={{ background: 'rgba(22,20,45,0.6)', border: `1px solid ${accent ? 'rgba(230,0,126,0.2)' : 'rgba(123,100,169,0.12)'}`, borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 900, color: color || (accent ? '#E6007E' : '#fff'), letterSpacing: '-0.02em', lineHeight: 1 }}>{typeof value === 'number' ? value.toLocaleString('it-IT') : value}</span>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60); const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(22,20,45,0.95)', border: '1px solid rgba(123,100,169,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4, color: 'rgba(255,255,255,0.6)' }}>{label}</div>}
      {payload.map((e) => <div key={e.name} style={{ color: e.color, fontWeight: 600 }}>{e.name}: {e.value}</div>)}
    </div>
  )
}

function Btn({ children, onClick, accent }: { children: React.ReactNode; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${accent ? 'rgba(230,0,126,0.25)' : 'rgba(123,100,169,0.18)'}`, background: accent ? 'rgba(230,0,126,0.06)' : 'rgba(255,255,255,0.025)', color: accent ? '#E6007E' : 'rgba(255,255,255,0.5)' }}>
      {children}
    </button>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(10,8,30,0.92)', backdropFilter: 'blur(16px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 480, padding: '28px 34px', background: 'rgba(22,20,45,0.98)', border: '1px solid rgba(123,100,169,0.25)', borderRadius: 20, boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{label}</label>
      {children}
    </div>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 16, background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', color: '#ff4444', fontSize: 12, fontWeight: 600 }}>{msg}</div>
}

function ModalActions({ onCancel, onSave, saving, label }: { onCancel: () => void; onSave: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex items-center justify-end gap-3" style={{ marginTop: 24 }}>
      <button onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(123,100,169,0.18)', background: 'rgba(255,255,255,0.025)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
      <button onClick={onSave} disabled={saving} style={{ padding: '8px 24px', borderRadius: 8, background: saving ? 'rgba(230,0,126,0.5)' : '#E6007E', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Salvataggio...' : label}</button>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(123,100,169,0.2)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, fontWeight: 500, outline: 'none', fontFamily: 'inherit' }
