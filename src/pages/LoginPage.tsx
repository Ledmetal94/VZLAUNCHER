import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/store/authStore'
import { login as cloudLogin } from '@/services/cloudApi'

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
      login(data.user, data.accessToken)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso fallito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="noise-overlay relative flex items-center justify-center overflow-hidden"
      style={{ width: '100vw', height: '100vh', background: 'var(--color-surface)' }}
    >
      {/* Ambient blobs */}
      <div className="blob" style={{ width: 700, height: 700, filter: 'blur(160px)', background: 'rgba(82,49,137,0.2)', top: -200, left: -200 }} />
      <div className="blob" style={{ width: 500, height: 500, filter: 'blur(140px)', background: 'rgba(230,0,126,0.1)', bottom: -150, right: -150 }} />
      <div className="blob" style={{ width: 350, height: 350, filter: 'blur(120px)', background: 'rgba(82,49,137,0.1)', top: '40%', right: '20%' }} />

      {/* Login card */}
      <div
        className="relative z-10"
        style={{
          width: 420,
          padding: '40px 44px',
          background: 'rgba(22,20,45,0.75)',
          border: '1px solid rgba(123,100,169,0.2)',
          borderRadius: 24,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(82,49,137,0.08)',
        }}
      >
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logo.png"
            alt="VZ Launcher"
            style={{ height: 48, margin: '0 auto 16px' }}
          />
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            VZ Launcher
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Arcade Management System
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.04em' }}>
              Utente
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Inserisci utente"
              required
              autoFocus
              aria-label="Utente"
              style={{
                width: '100%',
                height: 44,
                padding: '0 16px',
                borderRadius: 10,
                border: '1px solid rgba(123,100,169,0.2)',
                background: 'rgba(255,255,255,0.03)',
                color: '#fff',
                fontSize: 14,
                fontFamily: 'Outfit, sans-serif',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#E6007E'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(230,0,126,0.15)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(123,100,169,0.2)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.04em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Inserisci password"
              required
              aria-label="Password"
              style={{
                width: '100%',
                height: 44,
                padding: '0 16px',
                borderRadius: 10,
                border: '1px solid rgba(123,100,169,0.2)',
                background: 'rgba(255,255,255,0.03)',
                color: '#fff',
                fontSize: 14,
                fontFamily: 'Outfit, sans-serif',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#E6007E'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(230,0,126,0.15)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(123,100,169,0.2)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', color: '#ff6b6b', fontSize: 12, fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 46,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #E6007E, #523189)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'Outfit, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(230,0,126,0.3)',
              letterSpacing: '0.02em',
            }}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        {/* Super admin link */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={() => navigate('/super-admin/login')}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.25)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
          >
            Accesso super admin →
          </button>
        </div>
      </div>
    </div>
  )
}
