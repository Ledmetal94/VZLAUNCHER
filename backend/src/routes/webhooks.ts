import { Router } from 'express'
import crypto from 'crypto'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import type { Request, Response } from 'express'

const router = Router()

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) return false
  const parts = signature.split(',').reduce((acc: Record<string, string>, part) => {
    const [key, value] = part.split('=')
    acc[key] = value
    return acc
  }, {})
  const timestamp = parts['t']
  const sig = parts['v1']
  if (!timestamp || !sig) return false
  const signedPayload = `${timestamp}.${payload}`
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

// POST /api/webhooks/stripe
router.post('/api/webhooks/stripe', async (req: Request, res: Response) => {
  try {
    // Verify Stripe signature in production
    if (STRIPE_WEBHOOK_SECRET) {
      const signature = req.headers['stripe-signature'] as string
      if (!signature) {
        logger.warn('Webhook missing stripe-signature header')
        return res.status(401).json({ error: 'Missing signature' })
      }
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      if (!verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET)) {
        logger.warn('Webhook signature verification failed')
        return res.status(401).json({ error: 'Invalid signature' })
      }
    } else {
      logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification')
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object
      const venueId = session?.metadata?.venueId
      const amount = parseInt(session?.metadata?.tokenAmount || '0', 10)
      const paymentReference = session?.id || session?.payment_intent

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

      // Increment venue balance
      const { data: venue } = await supabase
        .from('venues')
        .select('token_balance')
        .eq('id', venueId)
        .single()

      if (venue) {
        await supabase
          .from('venues')
          .update({ token_balance: venue.token_balance + amount })
          .eq('id', venueId)
      }

      logger.info(`Credited ${amount} tokens to venue ${venueId} via Stripe`)
    }

    res.json({ received: true })
  } catch (err) {
    logger.error({ err }, 'Webhook processing failed')
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

export default router
