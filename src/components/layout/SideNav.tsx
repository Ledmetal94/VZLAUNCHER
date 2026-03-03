import { useLocation, useNavigate } from 'react-router-dom'
import { GameController, ClockCounterClockwise, SignOut, DownloadSimple, Sliders, BookOpen, ChartBar } from '@phosphor-icons/react'
import { useAuthStore } from '../../store/authStore'
import { usePWAInstall } from '../../hooks/usePWAInstall'

const NAV_ITEMS = [
  { path: '/catalog', label: 'Games', Icon: GameController },
  { path: '/sessions', label: 'Sessions', Icon: ClockCounterClockwise },
  { path: '/analytics', label: 'Analytics', Icon: ChartBar },
]

const ADMIN_ITEMS = [
  { path: '/admin/config', label: 'Game Config', Icon: Sliders },
  { path: '/admin/tutorials', label: 'Tutorials', Icon: BookOpen },
]

export function SideNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const { canInstall, install } = usePWAInstall()

  const navButton = (path: string, label: string, Icon: React.ElementType) => {
    const active = location.pathname.startsWith(path)
    return (
      <button key={path} onClick={() => navigate(path)}
        className={`flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer w-full text-left ${
          active ? 'bg-[#E5007E22] text-[#E5007E] backdrop-blur-sm' : 'text-[#888888] hover:bg-white/[0.05] hover:text-[#F5F5F5]'
        }`}>
        <Icon size={20} weight={active ? 'fill' : 'regular'} />
        {label}
      </button>
    )
  }

  return (
    <nav className="flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-white/[0.03] backdrop-blur-xl border-r border-white/[0.06] px-3 py-6">
      {/* Brand */}
      <div className="px-3 mb-8">
        <img src="/assets/brand/logo-horizontal.png" alt="VZLAUNCHER" className="h-8 object-contain object-left" />
      </div>

      {/* Main nav */}
      <div className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ path, label, Icon }) => navButton(path, label, Icon))}

        {/* Admin section */}
        <>
          <div className="mx-3 my-3 border-t border-white/[0.06]" />
          <p className="px-3 text-[#444] text-xs font-semibold uppercase tracking-widest mb-1">Admin</p>
          {ADMIN_ITEMS.map(({ path, label, Icon }) => navButton(path, label, Icon))}
        </>
      </div>

      {/* Install PWA */}
      {canInstall && (
        <button onClick={install}
          className="flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium text-[#888888] hover:bg-white/[0.05] hover:text-[#E5007E] transition-all duration-150 cursor-pointer w-full text-left mb-1">
          <DownloadSimple size={20} weight="regular" />
          Install App
        </button>
      )}

      {/* Logout */}
      <button onClick={logout}
        className="flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium text-[#888888] hover:bg-white/[0.05] hover:text-[#FF2D2D] transition-all duration-150 cursor-pointer w-full text-left">
        <SignOut size={20} weight="regular" />
        Logout
      </button>
    </nav>
  )
}
