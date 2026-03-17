import { useLocation } from 'react-router'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div key={location.pathname} className="page-transition">
      {children}
    </div>
  )
}
