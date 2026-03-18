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

      if (!STRIPE_WEBHOOK_SECRET) {
        logger.error('STRIPE_WEBHOOK_SECRET not configured — rejecting webhook')
        return res.status(500).json({ error: 'Webhook secret not configured' })
      }

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

      switch (event.type) {
        case 'checkout.session.completed': {
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
            logger.error({ rpcError }, 'Failed to adjust token balance — rolling back transaction')
            await supabase
              .from('token_transactions')
              .delete()
              .eq('payment_reference', paymentReference)
            return res.status(500).json({ error: 'Balance update failed' })
          }

          logger.info(`Credited ${amount} tokens to venue ${venueId} via Stripe`)
          break
        }

        case 'payment_intent.payment_failed': {
          const intent = event.data.object as Stripe.PaymentIntent
          const venueId = intent.metadata?.venueId
          const failureMessage = intent.last_payment_error?.message || 'Unknown error'

          logger.warn(
            { venueId, paymentIntentId: intent.id, failureMessage },
            'Payment failed',
          )

          // Record failed attempt for audit trail
          if (venueId) {
            await supabase.from('token_transactions').insert({
              venue_id: venueId,
              type: 'purchase',
              amount: 0,
              payment_method: 'stripe',
              payment_reference: intent.id,
              status: 'failed',
              notes: failureMessage,
            })
          }
          break
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge
          const paymentIntentId = typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id

          // Get the original checkout session to find venue/token metadata
          // Refund amount is in cents — we need to map back to tokens
          const refundReference = `refund_${charge.id}`

          // Idempotency check
          const { data: existingRefund } = await supabase
            .from('token_transactions')
            .select('id')
            .eq('payment_reference', refundReference)
            .single()

          if (existingRefund) {
            logger.info(`Duplicate refund webhook for ${refundReference}, skipping`)
            return res.json({ received: true, duplicate: true })
          }

          // Find the original purchase transaction to get venue and token amount
          const { data: originalTx } = await supabase
            .from('token_transactions')
            .select('venue_id, amount')
            .eq('payment_reference', paymentIntentId)
            .eq('type', 'purchase')
            .eq('status', 'confirmed')
            .single()

          if (!originalTx) {
            // Try matching by checkout session ID (our payment_reference stores session.id)
            // If we can't find the original, log and skip — manual reconciliation needed
            logger.warn(
              { chargeId: charge.id, paymentIntentId },
              'Refund webhook: could not find original purchase transaction',
            )
            break
          }

          // Calculate refund token amount proportionally
          const originalAmountCents = charge.amount
          const refundedCents = charge.amount_refunded
          const tokenAmount = Math.round((refundedCents / originalAmountCents) * originalTx.amount)

          if (tokenAmount <= 0) {
            logger.warn({ chargeId: charge.id }, 'Refund amount resolves to 0 tokens, skipping')
            break
          }

          // Record refund transaction
          const { error: txError } = await supabase.from('token_transactions').insert({
            venue_id: originalTx.venue_id,
            type: 'refund',
            amount: -tokenAmount,
            payment_method: 'stripe',
            payment_reference: refundReference,
            status: 'confirmed',
          })

          if (txError) {
            logger.error({ txError }, 'Failed to insert refund transaction')
            return res.status(500).json({ error: 'Refund transaction insert failed' })
          }

          // Deduct tokens (negative amount)
          const { error: rpcError } = await supabase.rpc('adjust_token_balance', {
            p_venue_id: originalTx.venue_id,
            p_amount: -tokenAmount,
          })

          if (rpcError) {
            logger.error({ rpcError }, 'Failed to deduct refunded tokens — rolling back')
            await supabase
              .from('token_transactions')
              .delete()
              .eq('payment_reference', refundReference)
            return res.status(500).json({ error: 'Refund balance update failed' })
          }

          logger.info(
            `Refunded ${tokenAmount} tokens from venue ${originalTx.venue_id} (charge ${charge.id})`,
          )
          break
        }

        default:
          logger.info(`Unhandled webhook event: ${event.type}`)
      }

      res.json({ received: true })
    } catch (err) {
      logger.error({ err }, 'Webhook processing failed')
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  },
)

export default router
