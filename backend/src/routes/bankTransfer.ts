import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { z } from 'zod'
import { logAudit, actorFromReq } from '../lib/audit'
import { bankTransferRejectSchema, bankTransfersQuerySchema } from '../schemas/superAdmin'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

const bankTransferRequestSchema = z.object({
  amount: z.number().int().positive('amount must be positive'),
  packageId: z.number().int().min(1).max(4).optional(),
})

// POST /api/v1/tokens/bank-transfer-request — create a pending bank transfer
router.post(
  '/api/v1/tokens/bank-transfer-request',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = bankTransferRequestSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { amount } = parsed.data
      const venueId = req.user!.venueId
      const shortVenue = (venueId || 'unknown').slice(0, 8).toUpperCase()
      const ts = Date.now().toString(36).toUpperCase()
      const reference = `VZ-${shortVenue}-${ts}`

      const { data: tx, error } = await supabase
        .from('token_transactions')
        .insert({
          venue_id: venueId,
          type: 'purchase',
          amount,
          payment_method: 'bank_transfer',
          payment_reference: reference,
          status: 'pending',
        })
        .select('id, payment_reference, amount, status, created_at')
        .single()

      if (error) {
        logger.error({ error }, 'Failed to create bank transfer request')
        return next(createError(500, 'DB_ERROR', 'Failed to create transfer request'))
      }

      res.status(201).json({
        transferRequest: tx,
        bankDetails: {
          iban: 'IT60X0542811101000000123456',
          beneficiary: 'Virtual Zone S.r.l.',
          reference,
          amount: `Gettoni: ${amount}`,
        },
      })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/super-admin/bank-transfers — list bank transfers (paginated, server-side status filter)
router.get(
  '/api/v1/super-admin/bank-transfers',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const qParsed = bankTransfersQuerySchema.safeParse(req.query)
      if (!qParsed.success) {
        return next(createError(400, 'VALIDATION_ERROR', 'Invalid query parameters',
          qParsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))))
      }
      const { page, pageSize, status } = qParsed.data

      let query = supabase
        .from('token_transactions')
        .select('id, venue_id, amount, payment_reference, status, created_at', { count: 'exact' })
        .eq('payment_method', 'bank_transfer')
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (status) query = query.eq('status', status)

      const { data, error, count } = await query

      if (error) {
        logger.error({ error }, 'Failed to fetch bank transfers')
        return next(createError(500, 'DB_ERROR', 'Failed to fetch transfers'))
      }

      // Get venue names
      const transfers = data || []
      const venueIds = [...new Set(transfers.map((t) => t.venue_id))]
      let venueNames: Record<string, string> = {}
      if (venueIds.length > 0) {
        const { data: venues } = await supabase
          .from('venues')
          .select('id, name')
          .in('id', venueIds)
        if (venues) {
          venueNames = Object.fromEntries(venues.map((v) => [v.id, v.name]))
        }
      }

      res.json({
        transfers: transfers.map((t) => ({
          ...t,
          venueName: venueNames[t.venue_id] || t.venue_id.slice(0, 8),
        })),
        total: count || 0,
        page,
        pageSize,
      })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/super-admin/bank-transfers/:id/confirm — confirm a bank transfer
router.post(
  '/api/v1/super-admin/bank-transfers/:id/confirm',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const txId = req.params.id

      const { data: tx, error: findError } = await supabase
        .from('token_transactions')
        .select('id, venue_id, amount, status')
        .eq('id', txId)
        .eq('payment_method', 'bank_transfer')
        .single()

      if (findError || !tx) {
        return next(createError(404, 'NOT_FOUND', 'Transfer not found'))
      }

      if (tx.status !== 'pending') {
        return next(createError(400, 'INVALID_OPERATION', `Transfer already ${tx.status}`))
      }

      // Update status to confirmed
      const { error: updateError } = await supabase
        .from('token_transactions')
        .update({ status: 'confirmed' })
        .eq('id', txId)

      if (updateError) {
        logger.error({ error: updateError }, 'Failed to confirm transfer')
        return next(createError(500, 'DB_ERROR', 'Failed to confirm transfer'))
      }

      // Credit tokens
      const { error: rpcError } = await supabase.rpc('adjust_token_balance', {
        p_venue_id: tx.venue_id,
        p_amount: tx.amount,
      })

      if (rpcError) {
        logger.error({ error: rpcError }, 'Failed to credit tokens after bank transfer — rolling back')
        const { error: rollbackError } = await supabase
          .from('token_transactions')
          .update({ status: 'pending' })
          .eq('id', txId)
        if (rollbackError) {
          logger.error({ error: rollbackError }, 'Rollback failed — transaction in inconsistent state')
        }
        return next(createError(500, 'DB_ERROR', 'Failed to credit tokens'))
      }

      logger.info(`Bank transfer confirmed: ${tx.amount} tokens to venue ${tx.venue_id}`)
      logAudit({ ...actorFromReq(req), action: 'bank_transfer_confirm', targetType: 'transfer', targetId: txId, details: { amount: tx.amount, venueId: tx.venue_id } }, req)
      res.json({ success: true, credited: tx.amount })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/super-admin/bank-transfers/:id/reject — reject a bank transfer
router.post(
  '/api/v1/super-admin/bank-transfers/:id/reject',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const txId = req.params.id

      const { data: tx, error: findError } = await supabase
        .from('token_transactions')
        .select('id, venue_id, amount, status')
        .eq('id', txId)
        .eq('payment_method', 'bank_transfer')
        .single()

      if (findError || !tx) {
        return next(createError(404, 'NOT_FOUND', 'Transfer not found'))
      }

      if (tx.status !== 'pending') {
        return next(createError(400, 'INVALID_OPERATION', `Transfer already ${tx.status}`))
      }

      const rejectParsed = bankTransferRejectSchema.safeParse(req.body)
      const reason = rejectParsed.success ? rejectParsed.data.reason : undefined

      const { error: updateError } = await supabase
        .from('token_transactions')
        .update({ status: 'failed', notes: reason || 'Rejected by admin' })
        .eq('id', txId)

      if (updateError) {
        logger.error({ error: updateError }, 'Failed to reject transfer')
        return next(createError(500, 'DB_ERROR', 'Failed to reject transfer'))
      }

      logger.info(`Bank transfer rejected: ${tx.amount} tokens for venue ${tx.venue_id}`)
      logAudit({ ...actorFromReq(req), action: 'bank_transfer_reject', targetType: 'transfer', targetId: txId, details: { amount: tx.amount, venueId: tx.venue_id } }, req)
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  },
)

export default router
