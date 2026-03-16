import { z } from 'zod'

const platformEnum = z.enum(['herozone', 'vex', 'spawnpoint'])
const categoryEnum = z.enum(['arcade_light', 'arcade_full', 'avventura', 'lasergame', 'escape'])
const badgeEnum = z.enum(['NEW', 'HOT', 'TOP']).nullable().optional()

export const createGameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  platform: platformEnum,
  category: categoryEnum,
  min_players: z.number().int().min(1).max(20).default(1),
  max_players: z.number().int().min(1).max(20).default(6),
  duration_minutes: z.number().int().min(1).max(120).default(15),
  token_cost: z.number().int().min(0).max(100).default(1),
  description: z.string().max(1000).optional().default(''),
  thumbnail_url: z.string().max(500).optional().default(''),
  badge: badgeEnum,
  enabled: z.boolean().optional().default(true),
  bg: z.string().max(500).optional().default(''),
})

export const updateGameSchema = createGameSchema.partial()

export type CreateGameInput = z.infer<typeof createGameSchema>
export type UpdateGameInput = z.infer<typeof updateGameSchema>
