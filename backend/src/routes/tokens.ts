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

// POST /api/v1/tokens/purchase — create Stripe Checkout Session
router.post(
  '/api/v1/tokens/purchase',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { packageId } = req.body
      if (!packageId || typeof packageId !== 'number' || packageId < 1 || packageId > 4) {
        return next(createError(400, 'VALIDATION_ERROR', 'Invalid packageId (1-4)'))
      }

      const venueId = req.user!.venueId
      const packages: Record<number, { tokens: number; priceEur: number }> = {
        1: { tokens: 500, priceEur: 575 },
        2: { tokens: 1500, priceEur: 1575 },
        3: { tokens: 3000, priceEur: 2850 },
        4: { tokens: 3001, priceEur: 2550.85 },
      }

      const pkg = packages[packageId]

      // In production: create Stripe Checkout Session here
      // For now, return a mock checkout URL
      const checkoutUrl = `https://checkout.stripe.com/mock?venue=${venueId}&tokens=${pkg.tokens}&price=${pkg.priceEur}`

      // Record pending transaction
      await supabase.from('token_transactions').insert({
        venue_id: venueId,
        type: 'purchase',
        amount: pkg.tokens,
        payment_method: 'stripe',
        payment_reference: `pending_${Date.now()}`,
        unit_price: pkg.priceEur / pkg.tokens,
        total_price: pkg.priceEur,
        status: 'pending',
      })

      res.json({ checkoutUrl, tokens: pkg.tokens, price: pkg.priceEur })
    } catch (err) {
      next(err)
    }
  },
)

export default router
