import { z } from 'zod'

export const consumeSchema = z.object({
  amount: z.number().int().positive('amount must be a positive integer'),
  gameId: z.string().uuid('gameId must be a valid UUID'),
  sessionId: z.string().uuid('sessionId must be a valid UUID').optional(),
})

export type ConsumeInput = z.infer<typeof consumeSchema>

export const manualCreditSchema = z.object({
  amount: z.number().int('amount must be an integer'),
  reason: z.string().min(1, 'reason is required').max(200, 'reason must be 200 characters or less'),
})

export type ManualCreditInput = z.infer<typeof manualCreditSchema>
