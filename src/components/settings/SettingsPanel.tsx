import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  X,
  GameController,
  ClockCounterClockwise,
  ChartBar,
  Sliders,
  BookOpen,
  Users,
  Buildings,
  SignOut,
  DownloadSimple,
  User,
} from '@phosphor-icons/react'
import { useSettingsPanelStore } from '../../store/settingsPanelStore'
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
  { path: '/admin/users', label: 'Users', Icon: Users },
  { path: '/admin/venue', label: 'Venue Settings', Icon: Buildings },
]

export function SettingsPanel() {
  const { isOpen, close } = useSettingsPanelStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { name, role, venueName, logout } = useAuthStore()
  const { canInstall, install } = usePWAInstall()

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, close])

  // Close on route change
  useEffect(() => { close() }, [location.pathname, close])

  const isAdmin = role === 'admin'

  function go(path: string) {
    navigate(path)
    close()
  }

  function handleLogout() {
    logout()
    close()
    navigate('/login')
  }

  const navLink = (path: string, label: string, Icon: React.ElementType) => {
    const active = location.pathname.startsWith(path)
    return (
      <button
        key={path}
        onClick={() => go(path)}
        className={`flex items-center gap-3 w-full px-3 h-10 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${
          active
            ? 'bg-[#E5007E1A] text-[#E5007E]'
            : 'text-[#888] hover:bg-white/[0.05] hover:text-[#F5F5F5]'
        }`}
      >
        <Icon size={18} weight={active ? 'fill' : 'regular'} />
        {label}
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-72 z-50 flex flex-col bg-[#0D0C1A]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
          <img src="/assets/brand/logo-horizontal.png" alt="VZLAUNCHER" className="h-6 object-contain" />
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#555] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E5007E22] border border-[#E5007E44] flex items-center justify-center flex-shrink-0">
              <User size={18} color="#E5007E" />
            </div>
            <div className="min-w-0">
              <p className="text-[#F5F5F5] text-sm font-semibold truncate">{name ?? 'Operator'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  isAdmin ? 'bg-[#E5007E22] text-[#E5007E]' : 'bg-white/[0.06] text-[#888]'
                }`}>
                  {isAdmin ? 'Admin' : 'Staff'}
                </span>
                {venueName && <span className="text-[#555] text-xs truncate">{venueName}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ path, label, Icon }) => navLink(path, label, Icon))}

          {isAdmin && (
            <>
              <div className="mx-2 my-3 border-t border-white/[0.06]" />
              <p className="px-3 text-[#333] text-[10px] font-bold uppercase tracking-widest mb-1">Admin</p>
              {ADMIN_ITEMS.map(({ path, label, Icon }) => navLink(path, label, Icon))}
            </>
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-0.5">
          {canInstall && (
            <button
              onClick={install}
              className="flex items-center gap-3 w-full px-3 h-10 rounded-xl text-sm font-medium text-[#888] hover:bg-white/[0.05] hover:text-[#E5007E] transition-all cursor-pointer"
            >
              <DownloadSimple size={18} />
              Install App
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 h-10 rounded-xl text-sm font-medium text-[#888] hover:bg-white/[0.05] hover:text-[#FF4444] transition-all cursor-pointer"
          >
            <SignOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </>
  )
}
