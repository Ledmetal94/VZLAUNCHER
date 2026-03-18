import { z } from 'zod'

const dateFormat = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
const uuidFormat = z.string().uuid()

// Token transactions query
export const superAdminTokensQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(['purchase', 'consume', 'adjustment', 'refund']).optional(),
  venueId: uuidFormat.optional(),
  startDate: dateFormat.optional(),
  endDate: dateFormat.optional(),
})

// Royalties query
export const royaltiesQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM format').optional(),
  rate: z.coerce.number().min(0.01).max(10).optional(),
})

// Venue games update body
export const venueGamesBodySchema = z.object({
  games: z.array(z.object({
    gameId: uuidFormat,
    enabled: z.boolean(),
  })).max(200),
})

// Bank transfer reject body
export const bankTransferRejectSchema = z.object({
  reason: z.string().max(500).optional(),
})

// Audit logs query
export const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(25),
  action: z.string().max(50).optional(),
  startDate: dateFormat.optional(),
  endDate: dateFormat.optional(),
  search: z.string().max(100).optional(),
})

// Bank transfers query
export const bankTransfersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['pending', 'confirmed', 'failed']).optional(),
})
