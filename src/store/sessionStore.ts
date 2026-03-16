import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Game } from '@/types/models'
import {
  syncSession as cloudSyncSession,
  getSessionHistory,
  type CloudSession,
  type SyncSessionPayload,
} from '@/services/cloudApi'

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

export interface SessionRecord {
  id: string
  gameId: string
  gameName: string
  platform: string
  category: string
  playersCount: number
  durationPlanned: number
  durationActual: number
  tokensConsumed: number
  status: 'completed' | 'error' | 'cancelled'
  syncStatus: 'pending' | 'synced' | 'error'
  startedAt: string
  endedAt: string
}

interface SessionState {
  activeSession: ActiveSession | null
  history: SessionRecord[]
  startSession: (game: Game, players: number, sessionId: string) => void
  endSession: (status?: 'completed' | 'error' | 'cancelled', errorLog?: string) => void
  tick: () => void
  retrySync: (id: string) => Promise<void>
  fetchHistory: (page?: number, pageSize?: number) => Promise<{ data: CloudSession[]; total: number; page: number; pageSize: number }>
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      history: [],

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

      endSession: async (status = 'completed', errorLog?: string) => {
        const session = get().activeSession
        if (!session) return

        const now = new Date()
        const startedAt = new Date(session.startedAt).toISOString()
        const endedAt = now.toISOString()
        const durationActual = Math.floor((now.getTime() - session.startedAt) / 1000)

        const record: SessionRecord = {
          id: session.id,
          gameId: session.gameId,
          gameName: session.gameName,
          platform: session.platform,
          category: session.category,
          playersCount: session.players,
          durationPlanned: session.durationPlanned,
          durationActual,
          tokensConsumed: 1,
          status,
          syncStatus: 'pending',
          startedAt,
          endedAt,
        }

        // Add to history and clear active session
        set((state) => ({
          activeSession: null,
          history: [record, ...state.history],
        }))

        // Attempt cloud sync
        const payload: SyncSessionPayload = {
          gameId: record.gameId,
          platform: record.platform,
          category: record.category,
          playersCount: record.playersCount,
          durationPlanned: record.durationPlanned,
          durationActual: record.durationActual,
          tokensConsumed: record.tokensConsumed,
          status: record.status,
          ...(errorLog && { errorLog }),
          startedAt: record.startedAt,
          endedAt: record.endedAt,
        }

        try {
          const cloudResult = await cloudSyncSession(payload)
          set((state) => ({
            history: state.history.map((r) =>
              r.id === record.id
                ? { ...r, id: cloudResult.id, syncStatus: 'synced' as const }
                : r,
            ),
          }))
        } catch {
          set((state) => ({
            history: state.history.map((r) =>
              r.id === record.id ? { ...r, syncStatus: 'error' as const } : r,
            ),
          }))
        }
      },

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

      retrySync: async (id: string) => {
        const record = get().history.find((r) => r.id === id)
        if (!record || record.syncStatus === 'synced') return

        set((state) => ({
          history: state.history.map((r) =>
            r.id === id ? { ...r, syncStatus: 'pending' as const } : r,
          ),
        }))

        const payload: SyncSessionPayload = {
          gameId: record.gameId,
          platform: record.platform,
          category: record.category,
          playersCount: record.playersCount,
          durationPlanned: record.durationPlanned,
          durationActual: record.durationActual,
          tokensConsumed: record.tokensConsumed,
          status: record.status,
          startedAt: record.startedAt,
          endedAt: record.endedAt,
        }

        try {
          const cloudResult = await cloudSyncSession(payload)
          set((state) => ({
            history: state.history.map((r) =>
              r.id === id
                ? { ...r, id: cloudResult.id, syncStatus: 'synced' as const }
                : r,
            ),
          }))
        } catch {
          set((state) => ({
            history: state.history.map((r) =>
              r.id === id ? { ...r, syncStatus: 'error' as const } : r,
            ),
          }))
        }
      },

      fetchHistory: async (page = 1, pageSize = 20) => {
        const result = await getSessionHistory(page, pageSize)
        return result
      },
    }),
    {
      name: 'vz-sessions',
      partialize: (state) => ({
        history: state.history.filter((r) => r.syncStatus !== 'synced'),
      }),
    },
  ),
)
