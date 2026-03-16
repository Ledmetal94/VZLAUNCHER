import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

export default function Header() {
  const [time, setTime] = useState(new Date())
  const venueName = useAuthStore((s) => s.venueName)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = time.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <header className="glass flex h-14 shrink-0 items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="VZ" className="h-8" />
        <span className="text-sm text-muted">{venueName}</span>
      </div>

      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
            'bg-success/20 text-success',
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Online
        </div>

        <span className="font-mono text-sm text-white">{timeStr}</span>

        <button
          onClick={logout}
          className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:bg-surface-light hover:text-white"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
