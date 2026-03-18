import { Router } from 'express'
import { supabase } from '../../lib/supabase'
import { requireAuth, requireSuperAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import { superAdminTokensQuerySchema } from '../../schemas/superAdmin'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// GET /api/v1/super-admin/tokens/transactions — cross-venue paginated transaction history
router.get(
  '/api/v1/super-admin/tokens/transactions',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = superAdminTokensQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return next(createError(400, 'VALIDATION_ERROR', 'Invalid query parameters',
          parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))))
      }
      const { page, pageSize, type, venueId, startDate, endDate } = parsed.data

      let query = supabase
        .from('token_transactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (venueId) query = query.eq('venue_id', venueId)
      if (type) query = query.eq('type', type)
      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate + 'T23:59:59.999Z')

      const { data, error, count } = await query

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to fetch transactions'))
      }

      // Join venue names
      const transactions = data || []
      const venueIds = [...new Set(transactions.map((t) => t.venue_id))]
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
        transactions: transactions.map((t) => ({
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

export default router
