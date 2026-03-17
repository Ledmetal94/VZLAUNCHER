import { create } from 'zustand'
import { toast } from 'sonner'
import { getAccessToken } from '@/services/cloudApi'
import type { Game } from '@/types/models'
import { SAMPLE_GAMES } from '@/data/games'

const CACHE_KEY = 'vz_games_cache'
const ETAG_KEY = 'vz_games_etag'
const CLOUD_URL = import.meta.env.VITE_CLOUD_URL || 'http://localhost:3002'
const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

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
  } catch { /* localStorage full */ }
}

function getStoredEtag(): string | null {
  return localStorage.getItem(ETAG_KEY)
}

function saveEtag(etag: string) {
  localStorage.setItem(ETAG_KEY, etag)
}

interface GameState {
  games: Game[]
  loading: boolean
  error: string | null
  refreshTimer: ReturnType<typeof setInterval> | null
  fetchGames: () => Promise<void>
  startAutoRefresh: () => void
  stopAutoRefresh: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  games: loadCache() || SAMPLE_GAMES,
  loading: false,
  error: null,
  refreshTimer: null,

  fetchGames: async () => {
    set({ loading: true, error: null })
    try {
      const token = getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      }
      const storedEtag = getStoredEtag()
      if (storedEtag) {
        headers['If-None-Match'] = storedEtag
      }

      const res = await fetch(`${CLOUD_URL}/api/v1/games`, {
        headers,
        credentials: 'include',
        signal: AbortSignal.timeout(15000),
      })

      if (res.status === 304) {
        // Not modified — cache is fresh
        set({ loading: false })
        return
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const mapped = data.games.map(mapCloudGame)

      // Check for new/updated games
      const prevGames = get().games
      const prevIds = new Set(prevGames.map((g) => g.id))
      const newGames = mapped.filter((g: Game) => !prevIds.has(g.id))
      if (newGames.length > 0 && prevGames.length > 0) {
        toast.info(`${newGames.length} nuovo/i gioco/hi disponibile/i`)
      }

      // Save ETag
      const etag = res.headers.get('etag')
      if (etag) saveEtag(etag)

      saveCache(mapped)
      set({ games: mapped, loading: false })
    } catch (err) {
      const cached = loadCache()
      set({
        games: cached || SAMPLE_GAMES,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch games',
      })
    }
  },

  startAutoRefresh: () => {
    const existing = get().refreshTimer
    if (existing) return
    const timer = setInterval(() => get().fetchGames(), REFRESH_INTERVAL)
    set({ refreshTimer: timer })
  },

  stopAutoRefresh: () => {
    const timer = get().refreshTimer
    if (timer) {
      clearInterval(timer)
      set({ refreshTimer: null })
    }
  },
}))
