import { useEffect, useState } from 'react'
import { ArrowsClockwise, X } from '@phosphor-icons/react'

const BRIDGE_URL = 'http://localhost:3001'

type UpdateState = 'idle' | 'updating' | 'done' | 'error'

export function UpdateBanner() {
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [state, setState] = useState<UpdateState>('idle')

  useEffect(() => {
    fetch(`${BRIDGE_URL}/version`, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then(({ updateAvailable, latest }) => {
        if (updateAvailable) setLatestVersion(latest)
      })
      .catch(() => {})
  }, [])

  if (!latestVersion || dismissed) return null

  async function handleUpdate() {
    if (!confirm(`Aggiornare il bridge alla versione ${latestVersion}?\n\nIl bridge si riavvierà automaticamente.`)) return
    setState('updating')
    try {
      const res = await fetch(`${BRIDGE_URL}/update`, { method: 'POST' })
      if (res.ok) {
        setState('done')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="flex items-center justify-between px-6 py-2 bg-green-500/10 border-b border-green-500/20 text-green-400 text-sm">
        <span>Bridge aggiornato. Si riavvia automaticamente...</span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-between px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
        <span>Aggiornamento fallito. Esegui <code className="font-mono bg-white/10 px-1 rounded">update.bat</code> manualmente.</span>
        <button onClick={() => setDismissed(true)}><X size={14} /></button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-6 py-2 bg-[#E6007E]/10 border-b border-[#E6007E]/20 text-sm">
      <span className="text-white/70">
        Disponibile bridge <span className="text-white font-medium">v{latestVersion}</span>
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={handleUpdate}
          disabled={state === 'updating'}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#E6007E] text-white text-xs font-medium hover:bg-[#E6007E]/80 disabled:opacity-50 transition-colors"
        >
          <ArrowsClockwise size={13} className={state === 'updating' ? 'animate-spin' : ''} />
          {state === 'updating' ? 'Aggiornamento...' : 'Aggiorna ora'}
        </button>
        <button onClick={() => setDismissed(true)} className="text-white/40 hover:text-white/70 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
