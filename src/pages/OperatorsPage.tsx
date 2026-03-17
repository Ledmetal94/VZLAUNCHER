import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import {
  getOperators,
  createOperator,
  updateOperator,
  deleteOperator,
  type CloudOperator,
} from '@/services/cloudApi'
import { cn } from '@/lib/utils'

type ModalMode = 'create' | 'edit' | null
type DeleteConfirm = { op: CloudOperator } | null

interface FormState {
  name: string
  username: string
  password: string
  role: 'admin' | 'normal'
}

const emptyForm: FormState = { name: '', username: '', password: '', role: 'normal' }

export default function OperatorsPage() {
  const navigate = useNavigate()
  const venueId = useAuthStore((s) => s.venueId)
  const [operators, setOperators] = useState<CloudOperator[]>([])
  const [loading, setLoading] = useState(true)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>(null)

  const fetchAll = useCallback(async () => {
    if (!venueId) return
    setLoading(true)
    try {
      const data = await getOperators(venueId)
      setOperators(data)
    } catch {
      setOperators([])
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setModalMode('create')
  }

  function openEdit(op: CloudOperator) {
    setForm({ name: op.name, username: op.username, password: '', role: op.role })
    setEditingId(op.id)
    setError('')
    setModalMode('edit')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (modalMode === 'create') {
        await createOperator({
          name: form.name,
          username: form.username,
          password: form.password,
          role: form.role,
        })
      } else if (modalMode === 'edit' && editingId) {
        const payload: { name?: string; role?: 'admin' | 'normal'; password?: string } = {
          name: form.name,
          role: form.role,
        }
        if (form.password) payload.password = form.password
        await updateOperator(editingId, payload)
      }
      toast.success(modalMode === 'create' ? 'Operatore creato' : 'Operatore aggiornato')
      setModalMode(null)
      await fetchAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione fallita')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(op: CloudOperator) {
    setDeleteConfirm({ op })
  }

  async function confirmDelete() {
    if (!deleteConfirm) return
    try {
      await deleteOperator(deleteConfirm.op.id)
      toast.success('Operatore disattivato')
      setDeleteConfirm(null)
      await fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  const roleBadge = (role: string) => (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 6,
        background: role === 'admin' ? 'rgba(230,0,126,0.12)' : 'rgba(123,100,169,0.12)',
        color: role === 'admin' ? '#E6007E' : '#7B64A9',
        border: `1px solid ${role === 'admin' ? 'rgba(230,0,126,0.25)' : 'rgba(123,100,169,0.2)'}`,
      }}
    >
      {role}
    </span>
  )

  return (
    <div
      className="noise-overlay relative flex flex-col overflow-hidden"
      style={{ width: 1920, height: 1080, background: 'var(--color-surface)' }}
    >
      {/* Ambient blobs */}
      <div className="blob" style={{ width: 800, height: 800, filter: 'blur(160px)', background: 'rgba(82,49,137,0.18)', top: -300, left: -300 }} />
      <div className="blob" style={{ width: 600, height: 600, filter: 'blur(150px)', background: 'rgba(230,0,126,0.08)', bottom: -250, right: -200 }} />

      <div className="relative z-10 flex flex-1 flex-col min-h-0">
        {/* Header bar */}
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
              onClick={() => navigate('/')}
              style={{
                height: 36,
                borderRadius: 8,
                border: '1px solid rgba(123,100,169,0.18)',
                background: 'rgba(255,255,255,0.025)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '0 14px',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Catalogo
            </button>
            <span style={{ fontSize: 20, fontWeight: 800 }}>Gestione operatori</span>
          </div>
          <button
            onClick={openCreate}
            className={cn(
              'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white',
              'transition hover:bg-primary-hover',
            )}
          >
            + Nuovo operatore
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto" style={{ padding: '20px 32px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Caricamento...</span>
            </div>
          ) : operators.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div style={{ fontSize: 40, opacity: 0.3 }}>&#128100;</div>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.15)' }}>
                Nessun operatore registrato
              </span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.12)' }}>
                  {['Nome', 'Username', 'Ruolo', 'Stato', 'Creato il', 'Azioni'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.25)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr
                    key={op.id}
                    style={{
                      borderBottom: '1px solid rgba(123,100,169,0.06)',
                      opacity: op.active ? 1 : 0.4,
                    }}
                  >
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 700 }}>
                      {op.name}
                    </td>
                    <td style={{ padding: '12px', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                      {op.username}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {roleBadge(op.role)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: op.active ? '#44ff88' : '#ff4444',
                          textTransform: 'uppercase',
                          letterSpacing: '.06em',
                        }}
                      >
                        {op.active ? 'Attivo' : 'Disattivato'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                      {new Date(op.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {op.active && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(op)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 6,
                              border: '1px solid rgba(123,100,169,0.18)',
                              background: 'rgba(255,255,255,0.025)',
                              color: 'rgba(255,255,255,0.5)',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => handleDelete(op)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 6,
                              border: '1px solid rgba(255,68,68,0.2)',
                              background: 'rgba(255,68,68,0.06)',
                              color: '#ff4444',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Disattiva
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div
          className="absolute inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'rgba(10,8,30,0.92)', backdropFilter: 'blur(16px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null) }}
        >
          <div
            style={{
              width: 400,
              padding: '28px 34px',
              background: 'rgba(22,20,45,0.98)',
              border: '1px solid rgba(255,68,68,0.25)',
              borderRadius: 20,
              boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
              Conferma disattivazione
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
              Disattivare l'operatore <strong style={{ color: '#fff' }}>{deleteConfirm.op.name}</strong>?
              <br />L'operatore non potrà più accedere al sistema.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: '1px solid rgba(123,100,169,0.18)',
                  background: 'rgba(255,255,255,0.025)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Annulla
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,68,68,0.3)',
                  background: 'rgba(255,68,68,0.15)',
                  color: '#ff4444',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Disattiva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalMode && (
        <div
          className="absolute inset-0 z-[200] flex items-center justify-center"
          style={{
            background: 'rgba(10,8,30,0.92)',
            backdropFilter: 'blur(16px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalMode(null) }}
        >
          <div
            style={{
              width: 440,
              padding: '28px 34px',
              background: 'rgba(22,20,45,0.98)',
              border: '1px solid rgba(123,100,169,0.25)',
              borderRadius: 20,
              boxShadow: '0 40px 100px rgba(0,0,0,0.6),0 0 80px rgba(82,49,137,0.1)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {modalMode === 'create' ? 'Nuovo operatore' : 'Modifica operatore'}
              </div>
              <button
                onClick={() => setModalMode(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={cn(
                    'w-full rounded-lg border border-white/10 bg-surface-light px-4 py-2.5',
                    'text-white placeholder:text-muted-foreground',
                    'outline-none transition focus:border-primary focus:ring-1 focus:ring-primary',
                  )}
                  placeholder="Nome completo"
                  required
                  autoFocus
                />
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
                    className={cn(
                      'w-full rounded-lg border border-white/10 bg-surface-light px-4 py-2.5',
                      'text-white placeholder:text-muted-foreground font-mono',
                      'outline-none transition focus:border-primary focus:ring-1 focus:ring-primary',
                    )}
                    placeholder="username (solo lettere e numeri)"
                    required
                    minLength={3}
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-muted">
                  {modalMode === 'create' ? 'Password' : 'Nuova password (lascia vuoto per non cambiare)'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className={cn(
                    'w-full rounded-lg border border-white/10 bg-surface-light px-4 py-2.5',
                    'text-white placeholder:text-muted-foreground',
                    'outline-none transition focus:border-primary focus:ring-1 focus:ring-primary',
                  )}
                  placeholder={modalMode === 'create' ? 'Minimo 6 caratteri' : 'Lascia vuoto per non cambiare'}
                  required={modalMode === 'create'}
                  minLength={modalMode === 'create' ? 6 : undefined}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-muted">Ruolo</label>
                <div className="flex gap-3">
                  {(['normal', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: r }))}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 8,
                        border: `1px solid ${form.role === r ? (r === 'admin' ? '#E6007E' : '#7B64A9') : 'rgba(123,100,169,0.18)'}`,
                        background: form.role === r ? (r === 'admin' ? 'rgba(230,0,126,0.12)' : 'rgba(123,100,169,0.12)') : 'rgba(255,255,255,0.025)',
                        color: form.role === r ? '#fff' : 'rgba(255,255,255,0.4)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.15s',
                      }}
                    >
                      {r === 'normal' ? 'Operatore' : 'Admin'}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-danger">{error}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className={cn(
                  'w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white',
                  'transition hover:bg-primary-hover',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {saving ? 'Salvataggio...' : modalMode === 'create' ? 'Crea operatore' : 'Salva modifiche'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
