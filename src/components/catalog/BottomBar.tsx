import { Circle, WifiHigh, WifiSlash } from '@phosphor-icons/react'
import { useSessionStore } from '../../store/sessionStore'
import { useBridgeHealth } from '../../hooks/useBridgeHealth'

interface BottomBarProps {
  gameCount: number
}

export function BottomBar({ gameCount }: BottomBarProps) {
  const activeSession = useSessionStore((s) => s.current)
  const { healthy } = useBridgeHealth()

  return (
    <div className="h-9 bg-black/70 backdrop-blur-sm border-t border-white/[0.05] flex items-center justify-between px-4 flex-shrink-0">
      {/* Left — logo */}
      <div className="flex items-center gap-4">
        <img
          src="/assets/brand/logo-horizontal.png"
          alt="VZLAUNCHER"
          className="h-4 object-contain opacity-60"
        />
        <span className="text-[#444] text-xs">
          {gameCount} game{gameCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Right — status indicators */}
      <div className="flex items-center gap-4">
        {activeSession && (
          <div className="flex items-center gap-1.5">
            <Circle size={7} weight="fill" color="#E5007E" className="animate-pulse" />
            <span className="text-[#E5007E] text-xs font-medium">Session Active</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {healthy ? (
            <>
              <WifiHigh size={13} color="#22c55e" />
              <span className="text-[#22c55e] text-xs">Bridge Online</span>
            </>
          ) : (
            <>
              <WifiSlash size={13} color="#888888" />
              <span className="text-[#555] text-xs">Bridge Offline</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
