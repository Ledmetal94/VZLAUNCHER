import { Router } from 'express'
import express from 'express'
import Stripe from 'stripe'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import type { Request, Response } from 'express'

const router = Router()

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
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

// POST /api/webhooks/stripe — raw body for signature verification
router.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    try {
      let event: Stripe.Event

      if (STRIPE_WEBHOOK_SECRET) {
        const signature = req.headers['stripe-signature'] as string
        if (!signature) {
          logger.warn('Webhook missing stripe-signature header')
          return res.status(401).json({ error: 'Missing signature' })
        }
        try {
          event = getStripe().webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET)
        } catch (err) {
          logger.warn('Webhook signature verification failed')
          return res.status(401).json({ error: 'Invalid signature' })
        }
      } else {
        logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification')
        const body = typeof req.body === 'string' ? req.body : req.body.toString()
        event = JSON.parse(body) as Stripe.Event
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        const venueId = session.metadata?.venueId
        const amount = parseInt(session.metadata?.tokenAmount || '0', 10)
        const paymentReference = session.id

        if (!venueId || !amount) {
          logger.warn('Webhook missing venueId or amount in metadata')
          return res.status(400).json({ error: 'Missing metadata' })
        }

        // Idempotency check
        const { data: existing } = await supabase
          .from('token_transactions')
          .select('id')
          .eq('payment_reference', paymentReference)
          .single()

        if (existing) {
          logger.info(`Duplicate webhook for ${paymentReference}, skipping`)
          return res.json({ received: true, duplicate: true })
        }

        // Credit tokens
        const { error: txError } = await supabase.from('token_transactions').insert({
          venue_id: venueId,
          type: 'purchase',
          amount,
          payment_method: 'stripe',
          payment_reference: paymentReference,
          status: 'confirmed',
        })

        if (txError) {
          logger.error({ txError }, 'Failed to insert token transaction')
          return res.status(500).json({ error: 'Transaction insert failed' })
        }

        // Atomic balance increment
        const { error: rpcError } = await supabase.rpc('adjust_token_balance', {
          p_venue_id: venueId,
          p_amount: amount,
        })

        if (rpcError) {
          logger.error({ rpcError }, 'Failed to adjust token balance')
        }

        logger.info(`Credited ${amount} tokens to venue ${venueId} via Stripe`)
      }

      res.json({ received: true })
    } catch (err) {
      logger.error({ err }, 'Webhook processing failed')
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  },
)

export default router
