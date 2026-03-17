import { create } from 'zustand'

interface AutomationStep {
  step: number
  total: number
  label: string
  status: string
}

interface ConnectionState {
  bridgeStatus: 'online' | 'offline'
  cloudStatus: 'online' | 'offline'
  bridgeState: string
  platformStatuses: Record<string, string>
  automationStep: AutomationStep | null
  setBridgeStatus: (status: 'online' | 'offline') => void
  setCloudStatus: (status: 'online' | 'offline') => void
  setBridgeState: (state: string) => void
  setPlatformStatuses: (platforms: Record<string, string>) => void
  setAutomationStep: (step: AutomationStep | null) => void
}

export const useConnectionStore = create<ConnectionState>()((set) => ({
  bridgeStatus: 'offline',
  cloudStatus: 'offline',
  bridgeState: 'idle',
  platformStatuses: {},
  automationStep: null,
  setBridgeStatus: (status) => set({ bridgeStatus: status }),
  setCloudStatus: (status) => set({ cloudStatus: status }),
  setBridgeState: (state) => set({ bridgeState: state }),
  setPlatformStatuses: (platforms) => set({ platformStatuses: platforms }),
  setAutomationStep: (step) => set({ automationStep: step }),
}))
