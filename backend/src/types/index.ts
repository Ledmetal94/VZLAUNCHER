export interface Venue {
  id: string
  name: string
  city: string | null
  country: string | null
  timezone: string
  currency: string
  logo_url: string | null
  api_key: string
  active: boolean
  created_at: string
}

export interface Operator {
  id: string
  venue_id: string
  name: string
  pin_hash: string
  role: 'operator' | 'admin'
  active: boolean
  created_at: string
}

export interface Session {
  id: string
  venue_id: string
  operator_id: string
  game_id: string | null
  game_slug: string
  game_name: string
  launcher: string | null
  difficulty: string | null
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  price: number | null
  notes: string | null
  synced_at: string
}

export interface GameConfig {
  id: string
  venue_id: string
  game_slug: string
  enabled: boolean
  launcher: string
  price: number | null
  updated_at: string
}

// Express request augmentation
declare global {
  namespace Express {
    interface Request {
      venueId?: string
      operator?: {
        id: string
        name: string
        role: string
        venueId: string
      }
    }
  }
}
