import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import { requireAuth, requireSuperAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

const createOperatorSchema = z.object({
  venue_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  role: z.enum(['admin', 'normal']).default('normal'),
})

const updateOperatorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'normal']).optional(),
  password: z.string().min(6).max(100).optional(),
  active: z.boolean().optional(),
  venue_id: z.string().uuid().optional(),
})

// GET /api/v1/super-admin/operators — list all operators across venues
router.get(
  '/api/v1/super-admin/operators',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = req.query.venue_id as string | undefined

      let query = supabase
        .from('operators')
        .select('id, venue_id, name, username, role, active, created_at, updated_at')
        .order('name')

      if (venueId) {
        query = query.eq('venue_id', venueId)
      }

      const { data, error } = await query

      if (error) {
        logger.error({ error }, 'Failed to list operators')
        return next(createError(500, 'DB_ERROR', 'Failed to fetch operators'))
      }

      // Get venue names
      const venueIds = [...new Set((data || []).map((o) => o.venue_id))]
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', venueIds)

      const venueNames: Record<string, string> = {}
      for (const v of venues || []) {
        venueNames[v.id] = v.name
      }

      const operators = (data || []).map((o) => ({
        ...o,
        venueName: venueNames[o.venue_id] || 'Unknown',
      }))

      res.json({ operators })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/super-admin/operators — create operator for any venue
router.post(
  '/api/v1/super-admin/operators',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createOperatorSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { venue_id, name, username, password, role } = parsed.data

      // Check venue exists
      const { data: venue } = await supabase
        .from('venues')
        .select('id')
        .eq('id', venue_id)
        .single()

      if (!venue) return next(createError(404, 'NOT_FOUND', 'Venue not found'))

      // Check username unique
      const { data: existing } = await supabase
        .from('operators')
        .select('id')
        .eq('username', username)
        .single()

      if (existing) return next(createError(409, 'CONFLICT', 'Username already taken'))

      const password_hash = await bcrypt.hash(password, 10)

      const { data, error } = await supabase
        .from('operators')
        .insert({ venue_id, name, username, password_hash, role })
        .select('id, venue_id, name, username, role, active, created_at')
        .single()

      if (error) return next(createError(500, 'DB_ERROR', 'Failed to create operator'))

      res.status(201).json({ operator: data })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/v1/super-admin/operators/:id — update operator
router.patch(
  '/api/v1/super-admin/operators/:id',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateOperatorSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { password, ...rest } = parsed.data
      const updateData: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }

      if (password) {
        updateData.password_hash = await bcrypt.hash(password, 10)
      }

      const { data, error } = await supabase
        .from('operators')
        .update(updateData)
        .eq('id', req.params.id)
        .select('id, venue_id, name, username, role, active, created_at, updated_at')
        .single()

      if (error || !data) return next(createError(404, 'NOT_FOUND', 'Operator not found'))

      res.json({ operator: data })
    } catch (err) {
      next(err)
    }
  },
)

export default router
