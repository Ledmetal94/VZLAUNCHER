import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StopCircle, Monitor, MonitorPlay } from '@phosphor-icons/react'
import { useSessionStore } from '../store/sessionStore'
import { setWindowTopmost } from '../services/bridge'

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ActiveSessionPage() {
  const navigate = useNavigate()
  const current = useSessionStore((s) => s.current)
  const endSession = useSessionStore((s) => s.endSession)

  const [elapsed, setElapsed] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [streamError, setStreamError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  // Redirect if no active session
  useEffect(() => {
    if (!current) navigate('/catalog', { replace: true })
  }, [current])

  // Timer
  useEffect(() => {
    if (!current) return
    const base = Math.floor((Date.now() - current.startTime) / 1000)
    setElapsed(base)
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [current?.id])

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Stop stream on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [stream])

  const startDisplayCapture = async () => {
    setStreamError('')
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      })
      // Stop old stream if any
      stream?.getTracks().forEach((t) => t.stop())
      setStream(s)
      // Auto-clear when user stops sharing from browser UI
      s.getVideoTracks()[0].onended = () => setStream(null)
    } catch {
      setStreamError('Display capture cancelled or unavailable.')
    }
  }

  const stopDisplayCapture = () => {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }

  const handleEnd = () => {
    stream?.getTracks().forEach((t) => t.stop())
    setWindowTopmost(false)
    endSession()
    navigate('/sessions', { replace: true })
  }

  if (!current) return null

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0A0A]">

      {/* Background — live feed or blurred poster */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <img
          src={current.poster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.07] blur-2xl scale-110"
        />
      )}

      {/* Dark vignette overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/50" />

      {/* ── TOP-LEFT: Timer ── */}
      <div className="absolute top-4 left-5 flex flex-col">
        <span className="text-[#888888] text-[10px] font-semibold uppercase tracking-widest mb-0.5">
          Elapsed
        </span>
        <span className="text-5xl font-black text-white tabular-nums leading-none drop-shadow-lg">
          {formatTime(elapsed)}
        </span>
      </div>

      {/* ── TOP-RIGHT: Session badge + display button ── */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00E67611] border border-[#00E67633]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
          <span className="text-[#00E676] text-xs font-semibold">Live</span>
        </div>

        {stream ? (
          <button
            onClick={stopDisplayCapture}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E5007E22] border border-[#E5007E55] text-[#E5007E] text-xs font-semibold hover:bg-[#E5007E33] transition-colors cursor-pointer"
          >
            <MonitorPlay size={14} weight="fill" />
            Display On
          </button>
        ) : (
          <button
            onClick={startDisplayCapture}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-[#888888] text-xs font-semibold hover:bg-white/[0.10] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            <Monitor size={14} weight="thin" />
            Show Display
          </button>
        )}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="absolute bottom-0 left-0 right-0 px-5 py-4 flex items-center justify-between">

        {/* Left — game info */}
        <div className="flex items-center gap-3">
          <img
            src={current.poster}
            alt={current.gameName}
            className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0"
          />
          <div>
            <p className="text-white text-sm font-bold leading-tight">{current.gameName}</p>
            <p className="text-[#888888] text-xs">{current.operatorName} · €{current.price}</p>
          </div>
        </div>

        {/* Right — end session */}
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF2D2D18] border border-[#FF2D2D44] text-[#FF2D2D] text-sm font-semibold hover:bg-[#FF2D2D28] transition-colors cursor-pointer"
          >
            <StopCircle size={18} weight="fill" />
            End Session
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md border border-[#FF2D2D44] rounded-xl px-4 py-3">
            <p className="text-[#F5F5F5] text-sm font-medium">
              End session? <span className="text-[#888888] font-normal">{formatTime(elapsed)}</span>
            </p>
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-[#888888] text-xs font-semibold hover:bg-white/[0.10] transition-colors cursor-pointer"
            >
              Keep Playing
            </button>
            <button
              onClick={handleEnd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF2D2D] text-white text-xs font-semibold hover:bg-[#CC2424] transition-colors cursor-pointer"
            >
              <StopCircle size={14} weight="fill" />
              Confirm End
            </button>
          </div>
        )}
      </div>

      {/* Stream error toast */}
      {streamError && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/80 border border-white/10 text-[#888888] text-xs">
          {streamError}
        </div>
      )}
    </div>
  )
}
