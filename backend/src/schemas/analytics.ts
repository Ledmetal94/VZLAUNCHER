import { z } from 'zod'

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  operatorId: z.string().uuid().optional(),
})

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
