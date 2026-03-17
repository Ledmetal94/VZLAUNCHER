import { z } from 'zod'

export const createSessionSchema = z.object({
  gameId: z.string().uuid('gameId must be a valid UUID'),
  platform: z.enum(['herozone', 'vex', 'spawnpoint']),
  category: z.enum(['arcade_light', 'arcade_full', 'avventura', 'lasergame', 'escape']),
  playersCount: z.number().int().min(1).max(20),
  durationPlanned: z.number().int().min(0),
  durationActual: z.number().int().min(0),
  tokensConsumed: z.number().int().min(0),
  status: z.enum(['completed', 'error', 'cancelled']),
  errorLog: z.string().optional(),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }),
})

export type CreateSessionInput = z.infer<typeof createSessionSchema>

export const listSessionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['started_at', 'ended_at', 'platform', 'status']).default('started_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  operatorId: z.string().uuid().optional(),
  category: z.enum(['arcade_light', 'arcade_full', 'avventura', 'lasergame', 'escape']).optional(),
  status: z.enum(['completed', 'error', 'cancelled']).optional(),
})

export type ListSessionsInput = z.infer<typeof listSessionsSchema>
