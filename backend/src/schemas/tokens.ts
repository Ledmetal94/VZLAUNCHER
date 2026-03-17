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

export const purchaseSchema = z.object({
  packageId: z.number().int().min(1).max(4),
  quantity: z.number().int().min(3001).optional(),
}).refine(
  (data) => data.packageId !== 4 || (data.quantity !== undefined && data.quantity >= 3001),
  { message: 'Package 4 requires quantity >= 3001', path: ['quantity'] },
)

export type PurchaseInput = z.infer<typeof purchaseSchema>
