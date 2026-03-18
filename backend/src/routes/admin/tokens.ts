import { Router } from 'express'
import { supabase } from '../../lib/supabase'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import { manualCreditSchema } from '../../schemas/tokens'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// POST /api/v1/admin/venues/:id/tokens — manual credit/debit
router.post(
  '/api/v1/admin/venues/:id/tokens',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = manualCreditSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { amount, reason } = parsed.data
      const venueId = req.params.id

      // Venue isolation: non-super-admins can only manage their own venue
      if (req.user!.role !== 'super_admin' && venueId !== req.user!.venueId) {
        return next(createError(403, 'FORBIDDEN', 'Cannot manage tokens for another venue'))
      }

      // Fetch current balance
      const { data: venue, error: fetchError } = await supabase
        .from('venues')
        .select('token_balance')
        .eq('id', venueId)
        .single()

      if (fetchError || !venue) {
        return next(createError(404, 'NOT_FOUND', 'Venue not found'))
      }

      const newBalance = venue.token_balance + amount

      if (newBalance < 0) {
        return next(createError(400, 'INVALID_OPERATION', `Debit would result in negative balance. Current: ${venue.token_balance}, adjustment: ${amount}`))
      }

      // Update balance
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
          type: 'adjustment',
          amount,
          payment_method: 'manual',
          payment_reference: reason,
          status: 'confirmed',
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

// GET /api/v1/admin/tokens/transactions — paginated transaction history
router.get(
  '/api/v1/admin/tokens/transactions',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = req.user!.venueId
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
      const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20))
      const type = req.query.type as string | undefined
      const startDate = req.query.startDate as string | undefined
      const endDate = req.query.endDate as string | undefined

      let query = supabase
        .from('token_transactions')
        .select('*', { count: 'exact' })
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (type) query = query.eq('type', type)
      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate + 'T23:59:59.999Z')

      const { data, error, count } = await query

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to fetch transactions'))
      }

      res.json({
        transactions: data || [],
        total: count || 0,
        page,
        pageSize,
      })
    } catch (err) {
      next(err)
    }
  },
)

export default router
