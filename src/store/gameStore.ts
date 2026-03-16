import { create } from 'zustand'
import { getGames } from '@/services/cloudApi'
import type { Game } from '@/types/models'
import { SAMPLE_GAMES } from '@/data/games'

const CACHE_KEY = 'vz_games_cache'

function mapCloudGame(g: {
  id: string
  name: string
  platform: string
  category: string
  min_players: number
  max_players: number
  duration_minutes: number
  token_cost: number
  description: string
  thumbnail_url: string
  badge: string | null
  enabled: boolean
  bg: string
}): Game {
  return {
    id: g.id,
    name: g.name,
    platform: g.platform as Game['platform'],
    category: g.category as Game['category'],
    minPlayers: g.min_players,
    maxPlayers: g.max_players,
    durationMinutes: g.duration_minutes,
    tokenCost: g.token_cost,
    description: g.description || '',
    thumbnailUrl: g.thumbnail_url || '',
    badge: g.badge as Game['badge'],
    enabled: g.enabled,
    bg: g.bg || '',
  }
}

function loadCache(): Game[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Game[]
  } catch {
    return null
  }
}

function saveCache(games: Game[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(games))
  } catch {
    // localStorage full — ignore
  }
}

interface GameState {
  games: Game[]
  loading: boolean
  error: string | null
  fetchGames: () => Promise<void>
}

export const useGameStore = create<GameState>((set) => ({
  games: loadCache() || SAMPLE_GAMES,
  loading: false,
  error: null,

  fetchGames: async () => {
    set({ loading: true, error: null })
    try {
      const cloudGames = await getGames()
      const mapped = cloudGames.map(mapCloudGame)
      saveCache(mapped)
      set({ games: mapped, loading: false })
    } catch (err) {
      // Fallback: try cache, then static data
      const cached = loadCache()
      set({
        games: cached || SAMPLE_GAMES,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch games',
      })
    }
  },
}))
