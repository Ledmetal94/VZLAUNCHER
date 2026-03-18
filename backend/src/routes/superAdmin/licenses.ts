import { Router } from 'express'
import { supabase } from '../../lib/supabase'
import { requireAuth, requireSuperAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// GET /api/v1/super-admin/licenses — all venues' license status
router.get(
  '/api/v1/super-admin/licenses',
  requireAuth,
  requireSuperAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { data: venues, error } = await supabase
        .from('venues')
        .select('id, name, status, license_last_renew, created_at')
        .order('name')

      if (error) return next(createError(500, 'DB_ERROR', 'Failed to fetch venues'))

      const now = Date.now()
      const VALIDITY_DAYS = 30
      const GRACE_HOURS = 48

      const licenses = (venues || []).map((v) => {
        const lastRenew = v.license_last_renew ? new Date(v.license_last_renew).getTime() : null
        const validUntil = lastRenew ? lastRenew + VALIDITY_DAYS * 24 * 60 * 60 * 1000 : null
        const daysRemaining = validUntil ? Math.floor((validUntil - now) / (24 * 60 * 60 * 1000)) : null
        const lastSeenMs = lastRenew ? now - lastRenew : null
        const graceRemaining = lastRenew ? Math.max(0, GRACE_HOURS - (now - lastRenew) / (60 * 60 * 1000)) : 0

        return {
          venueId: v.id,
          venueName: v.name,
          status: v.status,
          lastRenewedAt: v.license_last_renew,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          daysRemaining,
          lastSeenAgoMs: lastSeenMs,
          graceHoursRemaining: Math.round(graceRemaining * 10) / 10,
        }
      })

      // Sort by days remaining (most urgent first), nulls last
      licenses.sort((a, b) => {
        if (a.daysRemaining === null) return 1
        if (b.daysRemaining === null) return -1
        return a.daysRemaining - b.daysRemaining
      })

      res.json({ licenses })
    } catch (err) {
      next(err)
    }
  },
)

export default router
