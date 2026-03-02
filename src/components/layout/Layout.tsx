import type { ReactNode } from 'react'
import { SideNav } from './SideNav'

interface LayoutProps {
  children: ReactNode
  showNav?: boolean
}

export function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      {showNav && <SideNav />}
      <main className="flex-1 overflow-y-auto px-8 py-8">
        {children}
      </main>
    </div>
  )
}
