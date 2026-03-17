import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/store/authStore'
import { login as cloudLogin } from '@/services/cloudApi'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await cloudLogin(username, password)
      login(data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface">
      <div className="glass w-full max-w-sm rounded-xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">VZ Launcher</h1>
          <p className="mt-2 text-sm text-muted">Arcade Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={cn(
                'w-full rounded-lg border border-white/10 bg-surface-light px-4 py-2.5',
                'text-white placeholder:text-muted-foreground',
                'outline-none transition focus:border-primary focus:ring-1 focus:ring-primary',
              )}
              placeholder="Enter username"
              required
              autoFocus
              aria-label="Username"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                'w-full rounded-lg border border-white/10 bg-surface-light px-4 py-2.5',
                'text-white placeholder:text-muted-foreground',
                'outline-none transition focus:border-primary focus:ring-1 focus:ring-primary',
              )}
              placeholder="Enter password"
              required
              aria-label="Password"
            />
          </div>

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white',
              'transition hover:bg-primary-hover',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
