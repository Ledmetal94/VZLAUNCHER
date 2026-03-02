import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Game } from '../types'

export interface SessionRecord {
  id: string
  gameId: string
  gameSlug: string
  gameName: string
  launcher: string
  poster: string
  startTime: number   // ms timestamp
  endTime?: number
  duration?: number   // seconds
  price: number
  operatorId: string
  operatorName: string
}

interface SessionState {
  current: SessionRecord | null
  history: SessionRecord[]
  startSession: (game: Game, operatorId: string, operatorName: string) => void
  endSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      current: null,
      history: [],

      startSession: (game, operatorId, operatorName) => {
        const session: SessionRecord = {
          id: crypto.randomUUID(),
          gameId: game.id,
          gameSlug: game.slug,
          gameName: game.name,
          launcher: game.launcher,
          poster: game.poster,
          startTime: Date.now(),
          price: game.price,
          operatorId,
          operatorName,
        }
        set({ current: session })
      },

      endSession: () => {
        const { current, history } = get()
        if (!current) return
        const endTime = Date.now()
        const duration = Math.floor((endTime - current.startTime) / 1000)
        const completed: SessionRecord = { ...current, endTime, duration }
        set({ current: null, history: [completed, ...history] })
      },
    }),
    { name: 'vz-sessions' }
  )
)
