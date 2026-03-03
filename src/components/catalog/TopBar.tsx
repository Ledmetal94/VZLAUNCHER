import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Buildings, List } from '@phosphor-icons/react'
import { useAuthStore } from '../../store/authStore'
import { useSettingsPanelStore } from '../../store/settingsPanelStore'

interface TopBarProps {
  showBack?: boolean
}

export function TopBar({ showBack = false }: TopBarProps) {
  const navigate = useNavigate()
  const venueName = useAuthStore((s) => s.venueName)
  const toggle = useSettingsPanelStore((s) => s.toggle)

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
      <div className="flex items-center gap-2">
        {venueName && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg text-[#888888] text-sm">
            <Buildings size={18} weight="thin" />
            <span>{venueName}</span>
          </div>
        )}
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center text-[#888888] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-all cursor-pointer rounded-lg"
          title="Menu"
        >
          <List size={20} />
        </button>
      </div>
    </div>
  )
}
