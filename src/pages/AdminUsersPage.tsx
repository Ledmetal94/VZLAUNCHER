import { useEffect, useState } from 'react'
import {
  Plus, PencilSimple, X, Check, UserCircleMinus, Warning,
} from '@phosphor-icons/react'
import { Layout } from '../components/layout/Layout'
import {
  listOperators, createOperator, updateOperator, deactivateOperator,
  type OperatorRecord,
} from '../services/cloudApi'
import { useAuthStore } from '../store/authStore'

type FormMode = 'create' | 'edit'

interface FormState {
  name: string
  username: string
  password: string
  role: 'admin' | 'normal'
}

const EMPTY_FORM: FormState = { name: '', username: '', password: '', role: 'normal' }

export function AdminUsersPage() {
  const currentUserId = useAuthStore((s) => s.userId)
  const [users, setUsers] = useState<OperatorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [modal, setModal] = useState<{ mode: FormMode; user?: OperatorRecord } | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try { setUsers(await listOperators()) }
    catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(EMPTY_FORM); setFormError(null)
    setModal({ mode: 'create' })
  }

  function openEdit(user: OperatorRecord) {
    setForm({ name: user.name, username: user.username, password: '', role: user.role })
    setFormError(null)
    setModal({ mode: 'edit', user })
  }

  function closeModal() { setModal(null); setFormError(null) }

  async function handleSave() {
    if (!form.name.trim() || !form.username.trim()) {
      setFormError('Name and username are required'); return
    }
    if (modal?.mode === 'create' && !form.password.trim()) {
      setFormError('Password is required for new users'); return
    }
    setSaving(true); setFormError(null)
    try {
      if (modal?.mode === 'create') {
        const created = await createOperator({ name: form.name, username: form.username, password: form.password, role: form.role })
        setUsers((u) => [...u, created])
      } else if (modal?.mode === 'edit' && modal.user) {
        const payload: Parameters<typeof updateOperator>[1] = {
          name: form.name, username: form.username, role: form.role,
        }
        if (form.password.trim()) payload.password = form.password
        const updated = await updateOperator(modal.user.id, payload)
        setUsers((u) => u.map((x) => x.id === updated.id ? updated : x))
      }
      closeModal()
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(user: OperatorRecord) {
    if (!confirm(`Deactivate ${user.name}?`)) return
    try {
      await deactivateOperator(user.id)
      setUsers((u) => u.map((x) => x.id === user.id ? { ...x, active: false } : x))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-[#F5F5F5]">
            User <span className="text-[#E5007E]">Management</span>
          </h1>
          <p className="text-[#888] text-sm mt-1">{users.filter((u) => u.active).length} active users</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E5007E] text-white text-sm font-semibold hover:bg-[#CC006F] transition-all cursor-pointer"
        >
          <Plus size={16} weight="bold" />
          New User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 border-[#E5007E] border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Warning size={40} weight="thin" color="#FF4444" />
          <p className="text-[#FF4444] text-sm">{error}</p>
          <button onClick={load} className="text-[#E5007E] text-sm hover:underline cursor-pointer">Retry</button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] bg-white/[0.03] border-b border-white/[0.06]">
            {['Name', 'Username', 'Role', 'Status', ''].map((h) => (
              <div key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#555]">{h}</div>
            ))}
          </div>

          {users.length === 0 ? (
            <div className="px-4 py-10 text-center text-[#555] text-sm">No users found.</div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className={`grid grid-cols-[1fr_1fr_auto_auto_auto] border-b border-white/[0.04] last:border-0 transition-colors ${
                  user.active ? 'hover:bg-white/[0.02]' : 'opacity-40'
                }`}
              >
                <div className="px-4 py-3 flex items-center gap-2">
                  <p className="text-[#F5F5F5] text-sm font-medium">{user.name}</p>
                  {user.id === currentUserId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[#555]">you</span>
                  )}
                </div>
                <div className="px-4 py-3 flex items-center">
                  <p className="text-[#888] text-sm font-mono">{user.username}</p>
                </div>
                <div className="px-4 py-3 flex items-center">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    user.role === 'admin'
                      ? 'bg-[#E5007E22] text-[#E5007E]'
                      : 'bg-white/[0.06] text-[#888]'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${
                    user.active ? 'text-[#00E676]' : 'text-[#555]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-[#00E676]' : 'bg-[#555]'}`} />
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center gap-1">
                  <button
                    onClick={() => openEdit(user)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[#555] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-all cursor-pointer"
                    title="Edit"
                  >
                    <PencilSimple size={14} />
                  </button>
                  {user.active && user.id !== currentUserId && (
                    <button
                      onClick={() => handleDeactivate(user)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#555] hover:text-[#FF4444] hover:bg-[#FF444411] transition-all cursor-pointer"
                      title="Deactivate"
                    >
                      <UserCircleMinus size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0D0C1A] border border-white/[0.1] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-[#F5F5F5]">
                {modal.mode === 'create' ? 'New User' : 'Edit User'}
              </h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#555] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-all cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Full name', key: 'name', type: 'text', placeholder: 'Mario Rossi' },
                { label: 'Username', key: 'username', type: 'text', placeholder: 'mario.rossi' },
                { label: modal.mode === 'edit' ? 'New password (leave blank to keep)' : 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-[#555] text-xs mb-1 block">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key as keyof FormState]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#333] focus:outline-none focus:border-[#E5007E] transition-colors"
                  />
                </div>
              ))}

              <div>
                <label className="text-[#555] text-xs mb-1 block">Role</label>
                <div className="flex gap-2">
                  {(['normal', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setForm((f) => ({ ...f, role: r }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                        form.role === r
                          ? r === 'admin' ? 'bg-[#E5007E] text-white' : 'bg-white/[0.1] text-[#F5F5F5]'
                          : 'bg-white/[0.03] border border-white/[0.06] text-[#555] hover:text-[#888]'
                      }`}
                    >
                      {r === 'admin' ? 'Admin' : 'Staff'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {formError && (
              <p className="mt-3 text-[#FF4444] text-xs">{formError}</p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-[#888] hover:text-[#F5F5F5] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#E5007E] text-white text-sm font-semibold hover:bg-[#CC006F] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <><Check size={15} weight="bold" />{modal.mode === 'create' ? 'Create' : 'Save'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
