import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  getAdminGames, createGame, updateGame, uploadGameThumbnail,
  type CloudGame, type CreateGamePayload,
} from '@/services/cloudApi'

const CATEGORY_LABELS: Record<string, string> = {
  arcade_light: 'Arcade Light',
  arcade_full: 'Arcade Full',
  avventura: 'Avventura',
  lasergame: 'Laser Game',
  escape: 'Escape Room',
}

const PLATFORMS = ['herozone', 'vex', 'spawnpoint'] as const
const CATEGORIES = ['arcade_light', 'arcade_full', 'avventura', 'lasergame', 'escape'] as const
const BADGES = [null, 'NEW', 'HOT', 'TOP'] as const

const EMPTY_FORM: CreateGamePayload = {
  name: '',
  platform: 'herozone',
  category: 'arcade_light',
  min_players: 1,
  max_players: 6,
  duration_minutes: 15,
  token_cost: 1,
  description: '',
  thumbnail_url: '',
  badge: null,
  enabled: true,
  bg: '',
}

export default function GamesAdminPage({ backUrl = '/' }: { backUrl?: string }) {
  const navigate = useNavigate()
  const [games, setGames] = useState<CloudGame[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateGamePayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const loadGames = () => {
    setLoading(true)
    getAdminGames()
      .then(setGames)
      .catch(() => setGames([]))
      .finally(() => setLoading(false))
  }

  useEffect(loadGames, [])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setError('')
    setModal('create')
  }

  const openEdit = (g: CloudGame) => {
    setForm({
      name: g.name,
      platform: g.platform,
      category: g.category,
      min_players: g.min_players,
      max_players: g.max_players,
      duration_minutes: g.duration_minutes,
      token_cost: g.token_cost,
      description: g.description || '',
      thumbnail_url: g.thumbnail_url || '',
      badge: g.badge,
      enabled: g.enabled,
      bg: g.bg || '',
    })
    setEditId(g.id)
    setError('')
    setModal('edit')
  }

  const closeModal = () => {
    setModal(null)
    setError('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nome obbligatorio'); return }
    if (form.min_players > form.max_players) { setError('Min giocatori deve essere ≤ Max giocatori'); return }
    setSaving(true)
    setError('')
    try {
      if (modal === 'create') {
        await createGame(form)
        toast.success('Gioco creato')
      } else if (editId) {
        await updateGame(editId, form)
        toast.success('Gioco aggiornato')
      }
      closeModal()
      loadGames()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (g: CloudGame) => {
    try {
      await updateGame(g.id, { enabled: !g.enabled })
      toast.success(g.enabled ? 'Gioco disattivato' : 'Gioco attivato')
      loadGames()
    } catch {
      toast.error('Errore nel cambio stato')
    }
  }

  const set = <K extends keyof CreateGamePayload>(key: K, val: CreateGamePayload[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

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
            height: 56,
            padding: '0 32px',
            borderBottom: '1px solid rgba(123,100,169,0.12)',
            background: 'rgba(15,14,31,0.75)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(backUrl)}
              style={{
                height: 36, borderRadius: 8,
                border: '1px solid rgba(123,100,169,0.18)',
                background: 'rgba(255,255,255,0.025)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                padding: '0 14px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Catalogo
            </button>
            <span style={{ fontSize: 20, fontWeight: 800 }}>Gestione giochi</span>
          </div>
          <button
            onClick={openCreate}
            style={{
              height: 36, borderRadius: 8,
              background: '#E6007E', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 16px', color: '#fff', fontSize: 12, fontWeight: 700,
            }}
          >
            + Nuovo gioco
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto" style={{ padding: '20px 32px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Caricamento...</span>
            </div>
          ) : games.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div style={{ fontSize: 40, opacity: 0.3 }}>&#9813;</div>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.15)' }}>
                Nessun gioco configurato
              </span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.12)' }}>
                  {['Nome', 'Piattaforma', 'Categoria', 'Giocatori', 'Durata', 'Costo', 'Badge', 'Stato', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px', textAlign: 'left',
                        fontSize: 10, fontWeight: 600, letterSpacing: '.1em',
                        textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id} style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 700 }}>{g.name}</td>
                    <td style={{ padding: '12px', fontSize: 11, color: '#7B64A9' }}>{g.platform}</td>
                    <td style={{ padding: '12px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      {CATEGORY_LABELS[g.category] || g.category}
                    </td>
                    <td style={{ padding: '12px', fontSize: 12, fontWeight: 600 }}>
                      {g.min_players}–{g.max_players}
                    </td>
                    <td style={{ padding: '12px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      {g.duration_minutes} min
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 700, color: '#E6007E' }}>
                      {g.token_cost}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {g.badge && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '.08em',
                          padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(230,0,126,0.12)', color: '#E6007E',
                          border: '1px solid rgba(230,0,126,0.25)',
                        }}>
                          {g.badge}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => toggleEnabled(g)}
                        style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
                          padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                          border: `1px solid ${g.enabled ? 'rgba(68,255,136,0.25)' : 'rgba(255,68,68,0.2)'}`,
                          background: g.enabled ? 'rgba(68,255,136,0.08)' : 'rgba(255,68,68,0.06)',
                          color: g.enabled ? '#44ff88' : '#ff4444',
                          textTransform: 'uppercase',
                        }}
                      >
                        {g.enabled ? 'Attivo' : 'Disattivo'}
                      </button>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => openEdit(g)}
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '4px 10px',
                          borderRadius: 6, cursor: 'pointer',
                          border: '1px solid rgba(123,100,169,0.18)',
                          background: 'rgba(255,255,255,0.025)',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        Modifica
                      </button>
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
        <div
          className="absolute inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(10,8,30,0.92)', backdropFilter: 'blur(16px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{
            width: 520, padding: '28px 34px',
            background: 'rgba(22,20,45,0.98)',
            border: '1px solid rgba(123,100,169,0.25)',
            borderRadius: 20,
            boxShadow: '0 40px 100px rgba(0,0,0,0.6),0 0 80px rgba(82,49,137,0.1)',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
              {modal === 'create' ? 'Nuovo gioco' : 'Modifica gioco'}
            </h2>

            {error && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 16,
                background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)',
                color: '#ff4444', fontSize: 12, fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Name */}
              <Field label="Nome">
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  style={inputStyle}
                  placeholder="Nome del gioco"
                />
              </Field>

              {/* Row: Platform + Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Piattaforma">
                  <select value={form.platform} onChange={(e) => set('platform', e.target.value)} style={inputStyle}>
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Categoria">
                  <select value={form.category} onChange={(e) => set('category', e.target.value)} style={inputStyle}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </Field>
              </div>

              {/* Row: Players + Duration + Cost */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <Field label="Min gioc.">
                  <input type="number" value={form.min_players} onChange={(e) => set('min_players', +e.target.value)} style={inputStyle} min={1} max={20} />
                </Field>
                <Field label="Max gioc.">
                  <input type="number" value={form.max_players} onChange={(e) => set('max_players', +e.target.value)} style={inputStyle} min={1} max={20} />
                </Field>
                <Field label="Durata (min)">
                  <input type="number" value={form.duration_minutes} onChange={(e) => set('duration_minutes', +e.target.value)} style={inputStyle} min={1} max={120} />
                </Field>
                <Field label="Costo gettoni">
                  <input type="number" value={form.token_cost} onChange={(e) => set('token_cost', +e.target.value)} style={inputStyle} min={0} max={100} />
                </Field>
              </div>

              {/* Badge + Enabled */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Badge">
                  <select value={form.badge || ''} onChange={(e) => set('badge', e.target.value || null)} style={inputStyle}>
                    {BADGES.map((b) => <option key={b ?? 'none'} value={b ?? ''}>{b ?? 'Nessuno'}</option>)}
                  </select>
                </Field>
                <Field label="Stato">
                  <select value={form.enabled ? 'true' : 'false'} onChange={(e) => set('enabled', e.target.value === 'true')} style={inputStyle}>
                    <option value="true">Attivo</option>
                    <option value="false">Disattivo</option>
                  </select>
                </Field>
              </div>

              {/* Thumbnail upload */}
              <Field label="Thumbnail">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {form.thumbnail_url && (
                    <img
                      src={form.thumbnail_url}
                      alt="preview"
                      style={{
                        width: 56, height: 56, borderRadius: 8,
                        objectFit: 'cover',
                        border: '1px solid rgba(123,100,169,0.2)',
                      }}
                    />
                  )}
                  <label style={{
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid rgba(123,100,169,0.2)',
                    background: 'rgba(255,255,255,0.04)',
                    color: uploading ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
                    fontSize: 11, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    {uploading ? 'Caricamento...' : 'Carica immagine'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      disabled={uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 2 * 1024 * 1024) {
                          setError('Immagine troppo grande (max 2MB)')
                          return
                        }
                        setUploading(true)
                        setError('')
                        try {
                          const url = await uploadGameThumbnail(file)
                          set('thumbnail_url', url)
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : 'Upload fallito')
                        } finally {
                          setUploading(false)
                          e.target.value = ''
                        }
                      }}
                    />
                  </label>
                  {form.thumbnail_url && (
                    <button
                      onClick={() => set('thumbnail_url', '')}
                      style={{
                        fontSize: 10, color: '#ff4444', background: 'none',
                        border: 'none', cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
                {form.thumbnail_url && (
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 4, wordBreak: 'break-all' }}>
                    {form.thumbnail_url}
                  </span>
                )}
              </Field>

              {/* Description */}
              <Field label="Descrizione">
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  style={{ ...inputStyle, height: 60, resize: 'none' }}
                  placeholder="Descrizione breve..."
                />
              </Field>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3" style={{ marginTop: 24 }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  border: '1px solid rgba(123,100,169,0.18)',
                  background: 'rgba(255,255,255,0.025)',
                  color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                style={{
                  padding: '8px 24px', borderRadius: 8,
                  background: (saving || uploading) ? 'rgba(230,0,126,0.5)' : '#E6007E',
                  border: 'none', color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Salvataggio...' : uploading ? 'Upload in corso...' : modal === 'create' ? 'Crea gioco' : 'Salva modifiche'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(123,100,169,0.2)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
  outline: 'none',
  fontFamily: 'inherit',
}
