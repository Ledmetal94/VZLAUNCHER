import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

const OFFLINE_GRACE_HOURS = 48

// GET /api/v1/license/status — returns license state for the venue
router.get(
  '/api/v1/license/status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = req.user!.venueId

      if (!venueId) {
        // Super-admin always has valid license
        return res.json({
          status: 'active',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          offlineGraceHours: OFFLINE_GRACE_HOURS,
          serverTime: new Date().toISOString(),
        })
      }

      const { data: venue, error } = await supabase
        .from('venues')
        .select('id, name, status, created_at, updated_at')
        .eq('id', venueId)
        .single()

      if (error || !venue) {
        return next(createError(404, 'NOT_FOUND', 'Venue not found'))
      }

      const isActive = venue.status === 'active'

      res.json({
        status: isActive ? 'active' : 'suspended',
        venueId: venue.id,
        venueName: venue.name,
        validUntil: isActive
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days rolling
          : null,
        offlineGraceHours: OFFLINE_GRACE_HOURS,
        serverTime: new Date().toISOString(),
      })
    } catch (err) {
      next(err)
    }
  },
)

export default router
