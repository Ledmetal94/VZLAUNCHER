import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'

type LicenseStatus = 'active' | 'suspended' | 'expired' | 'unknown'

interface LicenseState {
  status: LicenseStatus
  lastValidatedAt: number | null
  lastRenewedAt: string | null
  validUntil: string | null
  offlineGraceHours: number
  emergencyOverride: boolean
  loading: boolean
  validate: () => Promise<void>
  setEmergencyOverride: (pin: string) => Promise<boolean>
  getOfflineTimeRemaining: () => number // ms remaining in offline grace
  isDegraded: () => boolean
}

const CLOUD_URL = import.meta.env.VITE_CLOUD_URL || 'http://localhost:3002'

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      status: 'unknown',
      lastValidatedAt: null,
      lastRenewedAt: null,
      validUntil: null,
      offlineGraceHours: 48,
      emergencyOverride: false,
      loading: false,

      validate: async () => {
        set({ loading: true })
        try {
          const { getAccessToken } = await import('@/services/cloudApi')
          const token = getAccessToken()
          if (!token) {
            // Not logged in yet, skip
            set({ loading: false })
            return
          }

          const res = await fetch(`${CLOUD_URL}/api/v1/license/status`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            signal: AbortSignal.timeout(10000),
          })

          if (res.ok) {
            const data = await res.json()
            const newStatus = data.status as LicenseStatus

            // Warn on status change
            const prev = get().status
            if (prev === 'active' && newStatus === 'suspended') {
              toast.error('Licenza sospesa — contattare il supporto')
            }

            set({
              status: newStatus,
              lastValidatedAt: Date.now(),
              lastRenewedAt: data.lastRenewedAt || null,
              validUntil: data.validUntil,
              offlineGraceHours: data.offlineGraceHours || 48,
              emergencyOverride: false,
            })
          }
        } catch {
          // Offline — keep last known state, rely on grace period
          const state = get()
          if (state.lastValidatedAt && state.status === 'active') {
            const graceMs = state.offlineGraceHours * 60 * 60 * 1000
            const elapsed = Date.now() - state.lastValidatedAt
            if (elapsed > graceMs) {
              set({ status: 'expired' })
              toast.error('Periodo offline scaduto — funzionalità limitate')
            }
          }
        } finally {
          set({ loading: false })
        }
      },

      setEmergencyOverride: async (pin: string) => {
        try {
          const { getAccessToken } = await import('@/services/cloudApi')
          const token = getAccessToken()

          const res = await fetch(`${CLOUD_URL}/api/v1/license/emergency-override`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({ pin }),
            signal: AbortSignal.timeout(10000),
          })

          if (res.ok) {
            const data = await res.json()
            set({
              emergencyOverride: true,
              status: 'active',
              lastValidatedAt: Date.now(),
              offlineGraceHours: data.graceHours || 24,
            })
            toast.success(`Override di emergenza attivato — ${data.graceHours || 24}h aggiuntive`)
            return true
          }

          const body = await res.json().catch(() => ({}))
          toast.error(body.error?.message || 'PIN non valido')
          return false
        } catch {
          toast.error('Impossibile verificare il PIN — controllare la connessione')
          return false
        }
      },

      getOfflineTimeRemaining: () => {
        const state = get()
        if (!state.lastValidatedAt) return 0
        const graceMs = (state.offlineGraceHours || 48) * 60 * 60 * 1000
        const elapsed = Date.now() - state.lastValidatedAt
        return Math.max(0, graceMs - elapsed)
      },

      isDegraded: () => {
        const state = get()
        if (state.emergencyOverride) return false
        return state.status === 'expired' || state.status === 'suspended'
      },
    }),
    {
      name: 'vz-license',
      partialize: (state) => ({
        status: state.status,
        lastValidatedAt: state.lastValidatedAt,
        lastRenewedAt: state.lastRenewedAt,
        validUntil: state.validUntil,
        offlineGraceHours: state.offlineGraceHours,
        emergencyOverride: state.emergencyOverride,
      }),
    },
  ),
)
