import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Game } from '../types'
import { syncSession } from '../services/cloudApi'
import { pushSessionToBridge } from '../services/bridge'

export type SyncStatus = 'pending' | 'synced' | 'error'

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
  difficulty?: string
  syncStatus: SyncStatus
}

interface SessionState {
  current: SessionRecord | null
  history: SessionRecord[]
  startSession: (game: Game, operatorId: string, operatorName: string, difficulty?: string) => void
  endSession: () => void
  retrySync: (sessionId: string) => Promise<void>
}

async function pushToCloud(session: SessionRecord): Promise<void> {
  await syncSession({
    id: session.id,
    gameSlug: session.gameSlug,
    gameName: session.gameName,
    launcher: session.launcher,
    difficulty: session.difficulty,
    startTime: new Date(session.startTime).toISOString(),
    endTime: session.endTime ? new Date(session.endTime).toISOString() : undefined,
    durationSeconds: session.duration,
    price: session.price,
  })
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      current: null,
      history: [],

      startSession: (game, operatorId, operatorName, difficulty) => {
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
          difficulty,
          syncStatus: 'pending',
        }
        set({ current: session })
      },

      endSession: () => {
        const { current, history } = get()
        if (!current) return
        const endTime = Date.now()
        const duration = Math.floor((endTime - current.startTime) / 1000)
        const completed: SessionRecord = { ...current, endTime, duration, syncStatus: 'pending' }
        set({ current: null, history: [completed, ...history] })

        // Persist to local bridge (best-effort)
        pushSessionToBridge(completed).catch(() => {})

        // Sync to cloud (best-effort)
        pushToCloud(completed)
          .then(() =>
            set((s) => ({
              history: s.history.map((h) =>
                h.id === completed.id ? { ...h, syncStatus: 'synced' } : h
              ),
            }))
          )
          .catch(() =>
            set((s) => ({
              history: s.history.map((h) =>
                h.id === completed.id ? { ...h, syncStatus: 'error' } : h
              ),
            }))
          )
      },

      retrySync: async (sessionId: string) => {
        const session = get().history.find((h) => h.id === sessionId)
        if (!session) return
        set((s) => ({
          history: s.history.map((h) =>
            h.id === sessionId ? { ...h, syncStatus: 'pending' } : h
          ),
        }))
        try {
          await pushToCloud(session)
          set((s) => ({
            history: s.history.map((h) =>
              h.id === sessionId ? { ...h, syncStatus: 'synced' } : h
            ),
          }))
        } catch {
          set((s) => ({
            history: s.history.map((h) =>
              h.id === sessionId ? { ...h, syncStatus: 'error' } : h
            ),
          }))
        }
      },
    }),
    { name: 'vz-sessions' }
  )
)
