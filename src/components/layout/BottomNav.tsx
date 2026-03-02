import { useLocation, useNavigate } from 'react-router-dom'
import { GameController, ClockCounterClockwise, SignOut } from '@phosphor-icons/react'
import { useAuthStore } from '../../store/authStore'

const NAV_ITEMS = [
  { path: '/catalog', label: 'Games', Icon: GameController },
  { path: '/sessions', label: 'Sessions', Icon: ClockCounterClockwise },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-[#2A2A2A] flex items-center justify-around px-4 py-2 z-50">
      {NAV_ITEMS.map(({ path, label, Icon }) => {
        const active = location.pathname.startsWith(path)
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center cursor-pointer transition-colors"
          >
            <Icon
              size={28}
              weight={active ? 'fill' : 'thin'}
              color={active ? '#E5007E' : '#888888'}
            />
            <span className={`text-xs font-medium ${active ? 'text-[#E5007E]' : 'text-[#888888]'}`}>
              {label}
            </span>
          </button>
        )
      })}
      <button
        onClick={logout}
        className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center cursor-pointer transition-colors"
      >
        <SignOut size={28} weight="thin" color="#888888" />
        <span className="text-xs font-medium text-[#888888]">Logout</span>
      </button>
    </nav>
  )
}
