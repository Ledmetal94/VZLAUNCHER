import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GAMES } from '../data/games'

export interface GameConfig {
  price: number
  launcher: 'herozone' | 'vexplay'
  enabled: boolean
}

type GameConfigMap = Record<string, GameConfig>

interface ConfigState {
  games: GameConfigMap
  updateGame: (slug: string, patch: Partial<GameConfig>) => void
  resetGame: (slug: string) => void
  resetAll: () => void
}

function buildDefaults(): GameConfigMap {
  return Object.fromEntries(
    GAMES.map((g) => [g.slug, { price: g.price, launcher: g.launcher, enabled: true }])
  )
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      games: buildDefaults(),

      updateGame: (slug, patch) =>
        set((s) => ({
          games: { ...s.games, [slug]: { ...s.games[slug], ...patch } },
        })),

      resetGame: (slug) =>
        set((s) => {
          const defaults = buildDefaults()
          return { games: { ...s.games, [slug]: defaults[slug] } }
        }),

      resetAll: () => set({ games: buildDefaults() }),
    }),
    { name: 'vz-config' }
  )
)
