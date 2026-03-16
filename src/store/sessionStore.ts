import { create } from 'zustand'
import type { Game } from '@/types/models'

export interface ActiveSession {
  id: string
  gameId: string
  gameName: string
  platform: string
  category: string
  players: number
  durationPlanned: number
  startedAt: number
  elapsed: number
}

interface SessionState {
  activeSession: ActiveSession | null
  startSession: (game: Game, players: number, sessionId: string) => void
  endSession: () => void
  tick: () => void
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  activeSession: null,

  startSession: (game, players, sessionId) =>
    set({
      activeSession: {
        id: sessionId,
        gameId: game.id,
        gameName: game.name,
        platform: game.platform,
        category: game.category,
        players,
        durationPlanned: game.durationMinutes * 60,
        startedAt: Date.now(),
        elapsed: 0,
      },
    }),

  endSession: () => set({ activeSession: null }),

  tick: () => {
    const session = get().activeSession
    if (!session) return
    set({
      activeSession: {
        ...session,
        elapsed: Math.floor((Date.now() - session.startedAt) / 1000),
      },
    })
  },
}))
