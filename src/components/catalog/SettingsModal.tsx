import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { useConnectionStore } from '@/store/connectionStore'

interface SettingsModalProps {
  onClose: () => void
}

function StatusDot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 4px ${color}`,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  )
}

function SetRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 14px',
        borderRadius: 9,
        marginBottom: 5,
        background: 'rgba(82,49,137,0.05)',
        border: '1px solid rgba(123,100,169,0.06)',
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children, mt }: { children: React.ReactNode; mt?: boolean }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.25)',
        marginBottom: 10,
        ...(mt ? { marginTop: 16 } : {}),
      }}
    >
      {children}
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  danger,
  accent,
}: {
  children: React.ReactNode
  onClick?: () => void
  danger?: boolean
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 36,
        borderRadius: 8,
        border: `1px solid ${danger ? 'rgba(255,68,68,0.2)' : accent ? 'rgba(100,200,255,0.2)' : 'rgba(123,100,169,0.18)'}`,
        background: 'rgba(255,255,255,0.025)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '0 14px',
        color: danger ? 'rgba(255,100,100,0.6)' : accent ? 'rgba(100,200,255,0.7)' : 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'Outfit, sans-serif',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const navigate = useNavigate()
  const { venueName, venueId, role, logout } = useAuthStore()
  const bridgeStatus = useConnectionStore((s) => s.bridgeStatus)
  const cloudStatus = useConnectionStore((s) => s.cloudStatus)

  function handleLogout() {
    logout()
    onClose()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center"
      style={{
        background: 'rgba(10,8,30,0.92)',
        backdropFilter: 'blur(16px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: 500,
          padding: '28px 34px',
          background: 'rgba(22,20,45,0.98)',
          border: '1px solid rgba(123,100,169,0.25)',
          borderRadius: 20,
          boxShadow: '0 40px 100px rgba(0,0,0,0.6),0 0 80px rgba(82,49,137,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Impostazioni</div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sede */}
        <SectionLabel>Sede</SectionLabel>
        <SetRow>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{venueName || 'Virtual Zone'}</span>
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            ID: {venueId?.slice(0, 8) || 'N/A'}
          </span>
        </SetRow>

        {/* Licenza */}
        <SectionLabel mt>Licenza</SectionLabel>
        <SetRow>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Stato</span>
          <span style={{ fontSize: 10, color: '#44ff88', fontWeight: 600 }}>Attiva — online</span>
        </SetRow>
        <SetRow>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Ultimo rinnovo</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
            {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </SetRow>
        <SetRow>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Offline rimasto</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>48h disponibili</span>
        </SetRow>

        {/* Sistema */}
        <SectionLabel mt>Sistema</SectionLabel>
        <SetRow>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>API locale</span>
          <div className="flex items-center gap-1.5">
            <StatusDot color={bridgeStatus === 'online' ? '#44ff88' : '#ff4444'} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {bridgeStatus === 'online' ? 'localhost:3001' : 'Offline'}
            </span>
          </div>
        </SetRow>
        <SetRow>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Automation Engine</span>
          <div className="flex items-center gap-1.5">
            <StatusDot color={bridgeStatus === 'online' ? '#44ff88' : '#ff4444'} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Idle</span>
          </div>
        </SetRow>
        <SetRow>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Backend cloud</span>
          <div className="flex items-center gap-1.5">
            <StatusDot color={cloudStatus === 'online' ? '#44ff88' : '#ff4444'} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {cloudStatus === 'online' ? 'Connesso' : 'Disconnesso'}
            </span>
          </div>
        </SetRow>

        {/* Azioni (admin only) */}
        {role === 'admin' && (
          <>
            <SectionLabel mt>Azioni</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <ActionBtn onClick={() => toast.info('Aggiornamento in corso...')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                Aggiorna giochi
              </ActionBtn>
              <ActionBtn onClick={() => toast.success('Report esportato')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Report sessioni
              </ActionBtn>
              <ActionBtn danger onClick={() => toast.warning('Riavvio piattaforme...')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18.36 6.64A9 9 0 1 1 5.64 5.64" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </svg>
                Riavvia
              </ActionBtn>
              <ActionBtn accent onClick={() => { onClose(); navigate('/operators') }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Gestione operatori
              </ActionBtn>
              <ActionBtn onClick={() => toast.info('Funzione in arrivo')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                Schermo PC (VNC)
              </ActionBtn>
            </div>
          </>
        )}

        {/* Logout */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(123,100,169,0.12)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: '1px solid rgba(255,68,68,0.2)',
              background: 'rgba(255,68,68,0.06)',
              color: '#ff4444',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            Esci (Logout)
          </button>
        </div>
      </div>
    </div>
  )
}
