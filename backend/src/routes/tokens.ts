import { Router } from 'express'
import Stripe from 'stripe'
import { supabase } from '../lib/supabase'
import { consumeSchema } from '../schemas/tokens'
import { createError } from '../middleware/errorHandler'
import { requireAuth } from '../middleware/auth'
import type { Request, Response, NextFunction } from 'express'

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}
const CHECKOUT_RETURN_URL = process.env.CHECKOUT_RETURN_URL
  || (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim()

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

      // Atomic decrement
      const { data: newBalance, error: rpcError } = await supabase.rpc('adjust_token_balance', {
        p_venue_id: venueId,
        p_amount: -amount,
      })

      if (rpcError) {
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

// POST /api/v1/tokens/purchase — create Stripe Embedded Checkout Session
router.post(
  '/api/v1/tokens/purchase',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { packageId, quantity } = req.body
      if (!packageId || typeof packageId !== 'number' || packageId < 1 || packageId > 4) {
        return next(createError(400, 'VALIDATION_ERROR', 'Invalid packageId (1-4)'))
      }

      // Package 4 requires a custom quantity (min 3001 tokens at €0.85 each)
      if (packageId === 4) {
        if (!quantity || typeof quantity !== 'number' || quantity < 3001) {
          return next(createError(400, 'VALIDATION_ERROR', 'Package 4 requires quantity >= 3001'))
        }
      }

      const venueId = req.user!.venueId
      const operatorId = req.user!.sub

      // Packages 1-3: fixed bundles. Package 4: per-token pricing.
      const packages: Record<number, { tokens: number; unitAmountCents: number; qty: number; name: string }> = {
        1: { tokens: 500, unitAmountCents: 57500, qty: 1, name: '500 Gettoni' },
        2: { tokens: 1500, unitAmountCents: 157500, qty: 1, name: '1.500 Gettoni' },
        3: { tokens: 3000, unitAmountCents: 285000, qty: 1, name: '3.000 Gettoni' },
        4: { tokens: quantity || 3001, unitAmountCents: 85, qty: quantity || 3001, name: 'Gettoni (€0,85/cad)' },
      }

      const pkg = packages[packageId]

      const session = await getStripe().checkout.sessions.create({
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              unit_amount: pkg.unitAmountCents,
              product_data: { name: pkg.name },
            },
            quantity: pkg.qty,
          },
        ],
        metadata: {
          venueId,
          operatorId,
          tokenAmount: String(pkg.tokens),
          packageId: String(packageId),
        },
        return_url: `${CHECKOUT_RETURN_URL}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      })

      res.json({ clientSecret: session.client_secret })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/checkout/session-status — check Stripe session status
router.get(
  '/api/v1/checkout/session-status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.query.session_id as string
      if (!sessionId) {
        return next(createError(400, 'VALIDATION_ERROR', 'Missing session_id'))
      }

      const session = await getStripe().checkout.sessions.retrieve(sessionId)

      // Verify the session belongs to the requesting user's venue
      if (session.metadata?.venueId && session.metadata.venueId !== req.user!.venueId) {
        return next(createError(403, 'FORBIDDEN', 'Session does not belong to this venue'))
      }

      res.json({
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        tokens: session.metadata?.tokenAmount ? parseInt(session.metadata.tokenAmount, 10) : null,
      })
    } catch (err) {
      next(err)
    }
  },
)

export default router
