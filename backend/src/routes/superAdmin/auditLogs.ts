import { Router } from 'express'
import { supabase } from '../../lib/supabase'
import { requireAuth, requireSuperAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import { auditLogsQuerySchema } from '../../schemas/superAdmin'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// GET /api/v1/super-admin/audit-logs — paginated, filterable audit log
router.get(
  '/api/v1/super-admin/audit-logs',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = auditLogsQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return next(createError(400, 'VALIDATION_ERROR', 'Invalid query parameters',
          parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))))
      }
      const { page, pageSize, action, startDate, endDate, search } = parsed.data

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (action) query = query.eq('action', action)
      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate + 'T23:59:59.999Z')
      if (search) {
        // Sanitize for PostgREST filter syntax — remove chars that have special meaning
        const sanitized = search.replace(/[,.()"'\\]/g, '')
        if (sanitized) {
          query = query.or(`actor_name.ilike.%${sanitized}%,target_name.ilike.%${sanitized}%`)
        }
      }

      const { data, error, count } = await query

      if (error) return next(createError(500, 'DB_ERROR', 'Failed to fetch audit logs'))

      res.json({
        logs: data || [],
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
