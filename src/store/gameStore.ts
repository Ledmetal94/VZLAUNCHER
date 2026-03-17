import { create } from 'zustand'
import { toast } from 'sonner'
import { getAccessToken } from '@/services/cloudApi'
import type { Game } from '@/types/models'
import { SAMPLE_GAMES, GAMES_WITH_POSTERS } from '@/data/games'

const CACHE_KEY = 'vz_games_cache'
const ETAG_KEY = 'vz_games_etag'
const CLOUD_URL = import.meta.env.VITE_CLOUD_URL || 'http://localhost:3002'
const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:8000'
const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Build a lookup: normalized game name → local folder id for poster URLs
const SAMPLE_POSTER_MAP = new Map<string, string>()
for (const g of SAMPLE_GAMES) {
  SAMPLE_POSTER_MAP.set(g.name.toLowerCase(), g.id)
}

function findPosterUrl(id: string, name: string): string {
  // Try matching by name to a known local game folder
  const localId = SAMPLE_POSTER_MAP.get(name.toLowerCase())
  if (localId) {
    return `${BRIDGE_URL}/api/games/assets/${localId}/poster.jpg`
  }
  // Fallback: try the id directly (works if id matches folder name)
  return `${BRIDGE_URL}/api/games/assets/${id}/poster.jpg`
}

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
    thumbnailUrl: g.thumbnail_url || findPosterUrl(g.id, g.name),
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
  games: SAMPLE_GAMES,
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
      const cloudGames = data.games
        .map(mapCloudGame)
        .filter((g: Game) => g.thumbnailUrl && GAMES_WITH_POSTERS.has(g.name.toLowerCase()))

      // Merge: cloud games + local-only SAMPLE_GAMES not in cloud
      const cloudNames = new Set(cloudGames.map((g: Game) => g.name.toLowerCase()))
      const localOnly = SAMPLE_GAMES.filter(g => !cloudNames.has(g.name.toLowerCase()))
      const merged = [...cloudGames, ...localOnly]

      // Save ETag
      const etag = res.headers.get('etag')
      if (etag) saveEtag(etag)

      saveCache(merged)
      set({ games: merged, loading: false })
    } catch (err) {
      // On failure, keep current games (don't overwrite with stale cache)
      set({
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
