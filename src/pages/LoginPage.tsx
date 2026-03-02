import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setError(null)
    setLoading(true)
    try {
      const success: boolean = await login(username.trim(), password)
      if (success) {
        navigate('/catalog', { replace: true })
      } else {
        setError('Credenziali non valide')
      }
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0C1A] px-6">
      {/* Logo */}
      <div className="mb-12 text-center">
        <img
          src="/assets/brand/logo-horizontal.png"
          alt="VZLAUNCHER"
          className="h-10 object-contain mx-auto mb-4"
        />
        <p className="text-[#888888] text-sm font-medium">Accesso operatore</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[#888888] text-xs font-medium uppercase tracking-wider">
            Username
          </label>
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(null) }}
            disabled={loading}
            placeholder="es. vzadmin"
            className="h-12 rounded-xl bg-[#141414] border border-[#2A2A2A] text-[#F5F5F5] px-4 text-sm
                       placeholder:text-[#444] focus:outline-none focus:border-[#E6007E] transition-colors disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[#888888] text-xs font-medium uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null) }}
            disabled={loading}
            placeholder="••••••••"
            className="h-12 rounded-xl bg-[#141414] border border-[#2A2A2A] text-[#F5F5F5] px-4 text-sm
                       placeholder:text-[#444] focus:outline-none focus:border-[#E6007E] transition-colors disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="text-[#FF2D2D] text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !username.trim() || !password}
          className="mt-2 h-12 rounded-xl bg-[#E6007E] text-white font-semibold text-sm
                     hover:bg-[#cc006f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Accedi'
          )}
        </button>
      </form>

      <p className="text-[#2A2A2A] text-xs mt-16">Virtual Zone Italia · VZLAUNCHER v1.0</p>
    </div>
  )
}
