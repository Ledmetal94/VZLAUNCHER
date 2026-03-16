export type Platform = 'herozone' | 'vex' | 'spawnpoint'

export type Category =
  | 'arcade_light'
  | 'arcade_full'
  | 'avventura'
  | 'lasergame'
  | 'escape'

export type Badge = 'NEW' | 'HOT' | 'TOP'

export interface Game {
  id: string
  name: string
  platform: Platform
  category: Category
  minPlayers: number
  maxPlayers: number
  durationMinutes: number
  tokenCost: number
  description: string
  thumbnailUrl: string
  badge: Badge | null
  enabled: boolean
}

export interface Operator {
  id: string
  name: string
  username: string
  role: 'admin' | 'normal'
  venueId: string
  venueName: string
}

export interface Session {
  id: string
  venueId: string
  gameId: string
  platform: Platform
  category: Category
  playersCount: number
  durationPlanned: number
  durationActual: number
  tokensConsumed: number
  status: 'completed' | 'error' | 'cancelled'
  syncStatus: 'pending' | 'synced' | 'error'
  startedAt: string
  endedAt: string
}
