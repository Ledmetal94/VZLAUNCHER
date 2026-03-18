import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

const OFFLINE_GRACE_HOURS = 48
const EMERGENCY_OVERRIDE_HOURS = 24
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

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
        .select('id, name, status, license_last_renew, created_at, updated_at')
        .eq('id', venueId)
        .single()

      if (error || !venue) {
        return next(createError(404, 'NOT_FOUND', 'Venue not found'))
      }

      const isActive = venue.status === 'active'

      // Update license_last_renew on successful validation
      if (isActive) {
        await supabase
          .from('venues')
          .update({ license_last_renew: new Date().toISOString() })
          .eq('id', venueId)
      }

      // validUntil = license_last_renew + 30 days (or now + 30 days on first renewal)
      const renewBase = isActive ? new Date() : (venue.license_last_renew ? new Date(venue.license_last_renew) : null)
      const validUntil = renewBase
        ? new Date(renewBase.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null

      res.json({
        status: isActive ? 'active' : 'suspended',
        venueId: venue.id,
        venueName: venue.name,
        validUntil,
        lastRenewedAt: isActive ? new Date().toISOString() : venue.license_last_renew,
        offlineGraceHours: OFFLINE_GRACE_HOURS,
        serverTime: new Date().toISOString(),
      })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/license/emergency-override — validate PIN server-side, grant temporary grace
router.post(
  '/api/v1/license/emergency-override',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pin } = req.body

      if (!pin || typeof pin !== 'string') {
        return next(createError(400, 'VALIDATION_ERROR', 'PIN is required'))
      }

      const pinHash = process.env.EMERGENCY_PIN_HASH
      if (!pinHash) {
        return next(createError(503, 'NOT_CONFIGURED', 'Emergency override is not configured'))
      }

      const valid = await bcrypt.compare(pin, pinHash)
      if (!valid) {
        return next(createError(401, 'INVALID_PIN', 'PIN non valido'))
      }

      // Grant a temporary override token (24h)
      const venueId = req.user!.venueId
      const overrideToken = jwt.sign(
        { type: 'emergency_override', venueId, grantedAt: Date.now() },
        JWT_SECRET,
        { expiresIn: `${EMERGENCY_OVERRIDE_HOURS}h` },
      )

      res.json({
        success: true,
        overrideToken,
        graceHours: EMERGENCY_OVERRIDE_HOURS,
        expiresAt: new Date(Date.now() + EMERGENCY_OVERRIDE_HOURS * 60 * 60 * 1000).toISOString(),
      })
    } catch (err) {
      next(err)
    }
  },
)

export default router
