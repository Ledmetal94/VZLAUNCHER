import { Router } from 'express'
import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import { requireAuth, requireSuperAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import { z } from 'zod'
import { logAudit, actorFromReq } from '../../lib/audit'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  contact_email: z.string().email().optional(),
  token_balance: z.number().int().min(0).default(0),
  status: z.enum(['active', 'suspended', 'onboarding']).default('active'),
  logo_url: z.string().max(500).optional(),
  default_token_cost: z.number().int().min(0).max(100).default(1),
  operating_hours: z.record(z.string()).optional(),
})

const updateVenueSchema = createVenueSchema.partial()

// GET /api/v1/super-admin/venues — list all venues
router.get(
  '/api/v1/super-admin/venues',
  requireAuth,
  requireSuperAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        logger.error({ error }, 'Failed to list venues')
        return next(createError(500, 'DB_ERROR', 'Failed to fetch venues'))
      }

      // Get operator counts per venue
      const { data: opCounts } = await supabase
        .from('operators')
        .select('venue_id')

      const countMap: Record<string, number> = {}
      for (const op of opCounts || []) {
        countMap[op.venue_id] = (countMap[op.venue_id] || 0) + 1
      }

      const venues = (data || []).map((v) => ({
        ...v,
        operatorCount: countMap[v.id] || 0,
      }))

      res.json({ venues })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/super-admin/venues — create venue
router.post(
  '/api/v1/super-admin/venues',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createVenueSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { data, error } = await supabase
        .from('venues')
        .insert(parsed.data)
        .select()
        .single()

      if (error) return next(createError(500, 'DB_ERROR', 'Failed to create venue'))

      res.status(201).json({ venue: data })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/v1/super-admin/venues/:id — update venue
router.patch(
  '/api/v1/super-admin/venues/:id',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateVenueSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { data: existing } = await supabase
        .from('venues')
        .select('id')
        .eq('id', req.params.id)
        .single()

      if (!existing) return next(createError(404, 'NOT_FOUND', 'Venue not found'))

      const updateData = { ...parsed.data, updated_at: new Date().toISOString() }
      const { data, error } = await supabase
        .from('venues')
        .update(updateData)
        .eq('id', req.params.id)
        .select()
        .single()

      if (error) return next(createError(500, 'DB_ERROR', 'Failed to update venue'))

      if (parsed.data.status) {
        logAudit({ ...actorFromReq(req), action: 'venue_status_change', targetType: 'venue', targetId: req.params.id, targetName: data.name, details: { status: parsed.data.status } }, req)
      }

      res.json({ venue: data })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/super-admin/venues/:id/tokens — credit tokens
router.post(
  '/api/v1/super-admin/venues/:id/tokens',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({ amount: z.number().int(), reason: z.string().optional() })
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) return next(createError(400, 'VALIDATION_ERROR', 'Invalid request'))

      const { amount, reason } = parsed.data
      const venueId = req.params.id

      const { data: venue } = await supabase
        .from('venues')
        .select('token_balance')
        .eq('id', venueId)
        .single()

      if (!venue) return next(createError(404, 'NOT_FOUND', 'Venue not found'))

      const newBalance = venue.token_balance + amount
      if (newBalance < 0) return next(createError(400, 'INVALID_OPERATION', 'Would result in negative balance'))

      const { error } = await supabase
        .from('venues')
        .update({ token_balance: newBalance })
        .eq('id', venueId)

      if (error) return next(createError(500, 'DB_ERROR', 'Failed to update balance'))

      await supabase.from('token_transactions').insert({
        venue_id: venueId,
        type: 'adjustment',
        amount,
        payment_method: 'manual',
        payment_reference: reason || 'Super-admin credit',
        status: 'confirmed',
      })

      res.json({ success: true, balance: newBalance })
    } catch (err) {
      next(err)
    }
  },
)

export default router
