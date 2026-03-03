import type { ReactNode } from 'react'
import { List } from '@phosphor-icons/react'
import { useSettingsPanelStore } from '../../store/settingsPanelStore'
import { useAuthStore } from '../../store/authStore'
import { UpdateBanner } from './UpdateBanner'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const toggle = useSettingsPanelStore((s) => s.toggle)
  const role = useAuthStore((s) => s.role)

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] overflow-hidden">
      {role === 'admin' && <UpdateBanner />}
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 h-12 border-b border-white/[0.05] flex-shrink-0">
        <img src="/assets/brand/logo-horizontal.png" alt="VZLAUNCHER" className="h-6 object-contain" />
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center text-[#555] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-all cursor-pointer rounded-lg"
          title="Menu"
        >
          <List size={20} />
        </button>
      </div>
      <main className="flex-1 overflow-y-auto px-8 py-8">
        {children}
      </main>
    </div>
  )
}
