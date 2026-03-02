import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Buildings, SignOut, Sliders, ClockCounterClockwise, BookOpen } from '@phosphor-icons/react'
import { useVenueStore } from '../../store/venueStore'

interface TopBarProps {
  showBack?: boolean
}

export function TopBar({ showBack = false }: TopBarProps) {
  const navigate = useNavigate()
  const venue = useVenueStore((s) => s.venue)
  const logout = useVenueStore((s) => s.logout)

  return (
    <div className="flex items-center justify-between px-4 h-11 bg-black/60 backdrop-blur-sm border-b border-white/[0.05] flex-shrink-0 z-20">
      {/* Left */}
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center text-[#888888] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
        ) : (
          <img
            src="/assets/brand/logo-horizontal.png"
            alt="VZLAUNCHER"
            className="h-6 object-contain object-left"
          />
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {venue && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg text-[#888888] text-sm">
            <Buildings size={18} weight="thin" />
            <span>{venue.name}</span>
          </div>
        )}

        <button
          onClick={() => navigate('/sessions')}
          className="w-8 h-8 flex items-center justify-center text-[#888888] hover:text-[#F5F5F5] transition-colors cursor-pointer rounded-lg hover:bg-white/[0.05]"
          title="Session history"
        >
          <ClockCounterClockwise size={18} weight="thin" />
        </button>

        <button
          onClick={() => navigate('/admin/config')}
          className="w-8 h-8 flex items-center justify-center text-[#888888] hover:text-[#E5007E] transition-colors cursor-pointer rounded-lg hover:bg-white/[0.05]"
          title="Game config"
        >
          <Sliders size={18} weight="thin" />
        </button>

        <button
          onClick={() => navigate('/admin/tutorials')}
          className="w-8 h-8 flex items-center justify-center text-[#888888] hover:text-[#E5007E] transition-colors cursor-pointer rounded-lg hover:bg-white/[0.05]"
          title="Tutorials"
        >
          <BookOpen size={18} weight="thin" />
        </button>

        <button
          onClick={logout}
          className="w-8 h-8 flex items-center justify-center text-[#888888] hover:text-[#FF2D2D] transition-colors cursor-pointer rounded-lg hover:bg-white/[0.05]"
          title="Logout sede"
        >
          <SignOut size={18} weight="thin" />
        </button>
      </div>
    </div>
  )
}
