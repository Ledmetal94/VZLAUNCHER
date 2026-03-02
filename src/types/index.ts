export interface Game {
  id: string
  slug: string
  name: string
  description: string
  genre: string
  players: string
  launcher: 'herozone' | 'vexplay'
  poster: string
  logo: string
  video?: string
  price: number
}

export interface Session {
  id: string
  gameId: string
  gameName: string
  launcher: string
  startTime: Date
  endTime?: Date
  duration?: number
  price: number
  operatorId: string
}

export interface Operator {
  id: string
  name: string
  pin: string
}
