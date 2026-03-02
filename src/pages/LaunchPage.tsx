import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { XCircle, ArrowLeft, ArrowClockwise } from '@phosphor-icons/react'
import { GAMES } from '../data/games'
import { checkBridgeHealth, prepareGame, startGame } from '../services/bridge'
import { Button } from '../components/ui/Button'
import { useSessionStore } from '../store/sessionStore'
import { useVenueStore } from '../store/venueStore'

type LaunchStatus = 'checking' | 'preparing' | 'ready' | 'starting' | 'error' | 'bridge_offline'
type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare'

const PREPARE_STEPS = [
  { label: 'Checking bridge connection...' },
  { label: 'Opening Hero Launcher...' },
  { label: 'Selecting game tile...' },
]

const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
  { value: 'easy',      label: 'Easy',      color: '#22C55E' },
  { value: 'normal',    label: 'Normal',    color: '#3B82F6' },
  { value: 'hard',      label: 'Hard',      color: '#F97316' },
  { value: 'nightmare', label: 'Nightmare', color: '#E5007E' },
]

export function LaunchPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const game = GAMES.find((g) => g.slug === slug)

  const startSession = useSessionStore((s) => s.startSession)
  const venue = useVenueStore((s) => s.venue)
  const operatorId = venue?.id ?? ''
  const operatorName = venue?.name ?? ''

  const [status, setStatus] = useState<LaunchStatus>('checking')
  const [stepIndex, setStepIndex] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  const runPrepare = async () => {
    setStatus('checking')
    setStepIndex(0)
    setErrorMsg('')

    const bridgeOnline = await checkBridgeHealth()
    if (!bridgeOnline) {
      setStatus('bridge_offline')
      return
    }

    setStatus('preparing')
    setStepIndex(1)

    const stepTimer = setTimeout(() => setStepIndex(2), 3000)

    try {
      const result = await prepareGame(slug!)
      clearTimeout(stepTimer)

      if (result.success) {
        setStatus('ready')
      } else {
        setStatus('error')
        setErrorMsg(result.error || 'Prepare failed')
      }
    } catch {
      clearTimeout(stepTimer)
      setStatus('error')
      setErrorMsg('Could not reach the bridge server.')
    }
  }

  const runStart = async () => {
    setStatus('starting')
    try {
      const result = await startGame(difficulty)
      if (result.success) {
        startSession(game!, operatorId, operatorName, difficulty)
        navigate('/session/active', { replace: true })
      } else {
        setStatus('error')
        setErrorMsg(result.error || 'Start failed')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Could not reach the bridge server.')
    }
  }

  useEffect(() => {
    if (game) runPrepare()
  }, [slug])

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] gap-4">
        <p className="text-[#888888]">Game not found.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/catalog')}>Back</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      <img
        src={game.poster}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-10 blur-xl scale-110"
      />

      <div className="relative flex flex-col items-center justify-center flex-1 px-6 text-center">

        {/* Preparing phase */}
        {(status === 'checking' || status === 'preparing') && (
          <>
            <p className="text-[#888888] text-sm font-medium mb-2 uppercase tracking-widest">Preparing</p>
            <h1 className="text-4xl font-black text-white mb-12">{game.name}</h1>
            <div className="flex flex-col items-center gap-8 w-full max-w-xs">
              <div className="w-20 h-20 rounded-full border-4 border-[#2A2A2A] border-t-[#E5007E] animate-spin" />
              <div className="flex flex-col gap-3 w-full">
                {PREPARE_STEPS.map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 text-sm font-medium transition-all ${
                    i < stepIndex ? 'text-[#E5007E]' : i === stepIndex ? 'text-[#F5F5F5]' : 'text-[#2A2A2A]'
                  }`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      i < stepIndex ? 'bg-[#E5007E]' : i === stepIndex ? 'bg-[#F5F5F5] animate-pulse' : 'bg-[#2A2A2A]'
                    }`} />
                    {step.label}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Ready — difficulty selector panel */}
        {status === 'ready' && (
          <div className="w-full max-w-sm">
            {/* Game thumbnail + name */}
            <div className="flex items-center gap-4 mb-8">
              <img
                src={game.poster}
                alt={game.name}
                className="w-16 h-16 rounded-xl object-cover border border-white/10 flex-shrink-0"
              />
              <div className="text-left">
                <p className="text-[#888888] text-xs font-medium uppercase tracking-widest mb-0.5">Ready to launch</p>
                <h1 className="text-2xl font-black text-white leading-tight">{game.name}</h1>
              </div>
            </div>

            {/* Panel */}
            <div className="bg-white/[0.04] backdrop-blur-md border border-[#E5007E22] rounded-2xl p-6">
              <p className="text-[#888888] text-xs font-medium uppercase tracking-widest mb-4">Select difficulty</p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`relative py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                      difficulty === d.value
                        ? 'border-current text-white'
                        : 'border-white/10 text-[#888888] hover:border-white/20 hover:text-[#CCCCCC]'
                    }`}
                    style={difficulty === d.value ? { color: d.color, borderColor: d.color, backgroundColor: `${d.color}15` } : {}}
                  >
                    {d.label}
                    {d.value === 'normal' && difficulty !== 'normal' && (
                      <span className="ml-1 text-[10px] text-[#555555]">default</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/catalog')}
                  fullWidth
                >
                  <ArrowLeft size={18} className="mr-2" /> Cancel
                </Button>
                <Button onClick={runStart} fullWidth>
                  Launch Game
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Starting phase */}
        {status === 'starting' && (
          <>
            <p className="text-[#888888] text-sm font-medium mb-2 uppercase tracking-widest">Launching</p>
            <h1 className="text-4xl font-black text-white mb-12">{game.name}</h1>
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full border-4 border-[#2A2A2A] border-t-[#E5007E] animate-spin" />
              <p className="text-[#888888] text-sm">
                Starting{' '}
                <span className="text-white font-semibold capitalize">{difficulty}</span>{' '}
                mode...
              </p>
            </div>
          </>
        )}

        {/* Bridge offline */}
        {status === 'bridge_offline' && (
          <div className="flex flex-col items-center gap-6 max-w-xs">
            <XCircle size={80} weight="thin" color="#FF2D2D" />
            <div>
              <p className="text-[#FF2D2D] text-xl font-semibold mb-2">Bridge offline</p>
              <p className="text-[#888888] text-sm">
                The VZLAUNCHER bridge server is not running. Start it with:
              </p>
              <code className="block mt-3 bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3 text-xs text-[#E5007E] text-left">
                cd bridge && npm start
              </code>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="secondary" onClick={() => navigate('/catalog')} fullWidth>
                <ArrowLeft size={18} className="mr-2" /> Back
              </Button>
              <Button onClick={runPrepare} fullWidth>
                <ArrowClockwise size={18} className="mr-2" /> Retry
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-6 max-w-xs">
            <XCircle size={80} weight="thin" color="#FF2D2D" />
            <div>
              <p className="text-[#FF2D2D] text-xl font-semibold mb-2">Launch failed</p>
              <p className="text-[#888888] text-sm">{errorMsg}</p>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="secondary" onClick={() => navigate('/catalog')} fullWidth>
                <ArrowLeft size={18} className="mr-2" /> Back
              </Button>
              <Button onClick={runPrepare} fullWidth>
                <ArrowClockwise size={18} className="mr-2" /> Retry
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
