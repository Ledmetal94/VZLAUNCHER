import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { logger } from '../lib/logger.js'
import type { Request, Response } from 'express'

const router = Router()

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

// POST /api/webhooks/stripe
// Must receive raw body for signature verification
router.post('/api/webhooks/stripe', async (req: Request, res: Response) => {
  // In production, verify Stripe signature here:
  // const sig = req.headers['stripe-signature']
  // const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET)

  try {
    const event = req.body

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
