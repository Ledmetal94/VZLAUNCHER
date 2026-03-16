import { create } from 'zustand'

interface ConnectionState {
  bridgeStatus: 'online' | 'offline'
  cloudStatus: 'online' | 'offline'
  setBridgeStatus: (status: 'online' | 'offline') => void
  setCloudStatus: (status: 'online' | 'offline') => void
}

export const useConnectionStore = create<ConnectionState>()((set) => ({
  bridgeStatus: 'offline',
  cloudStatus: 'offline',
  setBridgeStatus: (status) => set({ bridgeStatus: status }),
  setCloudStatus: (status) => set({ cloudStatus: status }),
}))
