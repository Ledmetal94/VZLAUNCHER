import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { consumeSchema } from '../schemas/tokens.js'
import { createError } from '../middleware/errorHandler.js'
import { requireAuth } from '../middleware/auth.js'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// GET /api/v1/tokens/balance — returns current venue token balance
router.get(
  '/api/v1/tokens/balance',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = req.user!.venueId

      const { data: venue, error } = await supabase
        .from('venues')
        .select('token_balance')
        .eq('id', venueId)
        .single()

      if (error || !venue) {
        return next(createError(500, 'DB_ERROR', 'Failed to fetch token balance'))
      }

      res.json({ balance: venue.token_balance })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/tokens/consume — decrement venue balance and record transaction
router.post(
  '/api/v1/tokens/consume',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = consumeSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { amount, gameId, sessionId } = parsed.data
      const venueId = req.user!.venueId

      // Check current balance
      const { data: venue, error: fetchError } = await supabase
        .from('venues')
        .select('token_balance')
        .eq('id', venueId)
        .single()

      if (fetchError || !venue) {
        return next(createError(500, 'DB_ERROR', 'Failed to fetch venue'))
      }

      if (venue.token_balance < amount) {
        return next(createError(402, 'INSUFFICIENT_TOKENS', `Insufficient token balance. Current: ${venue.token_balance}, required: ${amount}`))
      }

      const newBalance = venue.token_balance - amount

      // Decrement balance
      const { error: updateError } = await supabase
        .from('venues')
        .update({ token_balance: newBalance })
        .eq('id', venueId)

      if (updateError) {
        return next(createError(500, 'DB_ERROR', 'Failed to update token balance'))
      }

      // Record transaction
      const { error: txError } = await supabase
        .from('token_transactions')
        .insert({
          venue_id: venueId,
          type: 'consume',
          amount: -amount,
          status: 'confirmed',
          payment_reference: sessionId
            ? `game:${gameId};session:${sessionId}`
            : `game:${gameId}`,
        })

      if (txError) {
        return next(createError(500, 'DB_ERROR', 'Failed to record token transaction'))
      }

      res.json({ success: true, balance: newBalance })
    } catch (err) {
      next(err)
    }
  },
)

export default router
