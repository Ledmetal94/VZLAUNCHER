import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'
import { createOperatorSchema, updateOperatorSchema } from '../schemas/operators'
import { createError } from '../middleware/errorHandler'
import { requireAuth, requireAdmin } from '../middleware/auth'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

const OPERATOR_FIELDS = 'id, venue_id, name, username, role, active, created_at, updated_at'

// GET /api/v1/operators — list operators for the admin's venue
router.get(
  '/api/v1/operators',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Venue isolation: non-super-admins always see their own venue only
      const venueId = req.user!.role === 'super_admin'
        ? (req.query.venue_id as string) || req.user!.venueId
        : req.user!.venueId

      const { data, error } = await supabase
        .from('operators')
        .select(OPERATOR_FIELDS)
        .eq('venue_id', venueId)
        .order('created_at', { ascending: true })

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to fetch operators'))
      }

      res.json({ operators: data })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/operators — create operator
router.post(
  '/api/v1/operators',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createOperatorSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(
            400,
            'VALIDATION_ERROR',
            'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { name, username, password, role } = parsed.data
      const venueId = req.user!.venueId

      // Check username uniqueness
      const { data: existing } = await supabase
        .from('operators')
        .select('id')
        .eq('username', username)
        .single()

      if (existing) {
        return next(createError(409, 'CONFLICT', 'Username already taken'))
      }

      const passwordHash = await bcrypt.hash(password, 10)

      const { data: created, error } = await supabase
        .from('operators')
        .insert({
          name,
          username,
          password_hash: passwordHash,
          role,
          venue_id: venueId,
          active: true,
        })
        .select(OPERATOR_FIELDS)
        .single()

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to create operator'))
      }

      res.status(201).json({ operator: created })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/v1/operators/:id — update operator
router.patch(
  '/api/v1/operators/:id',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateOperatorSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(
            400,
            'VALIDATION_ERROR',
            'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0] || '_'), issue: i.message })),
          ),
        )
      }

      const { name, role, password } = parsed.data
      const operatorId = req.params.id

      // Verify operator exists and belongs to admin's venue
      const { data: existing, error: findError } = await supabase
        .from('operators')
        .select('id, venue_id')
        .eq('id', operatorId)
        .single()

      if (findError || !existing) {
        return next(createError(404, 'NOT_FOUND', 'Operator not found'))
      }

      if (existing.venue_id !== req.user!.venueId) {
        return next(createError(403, 'FORBIDDEN', 'Cannot update operator from another venue'))
      }

      // Build update payload
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (name !== undefined) updates.name = name
      if (role !== undefined) updates.role = role
      if (password !== undefined) updates.password_hash = await bcrypt.hash(password, 10)

      const { data: updated, error } = await supabase
        .from('operators')
        .update(updates)
        .eq('id', operatorId)
        .select(OPERATOR_FIELDS)
        .single()

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to update operator'))
      }

      res.json({ operator: updated })
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /api/v1/operators/:id — soft delete (set active=false)
router.delete(
  '/api/v1/operators/:id',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const operatorId = req.params.id

      // Verify operator exists and belongs to admin's venue
      const { data: existing, error: findError } = await supabase
        .from('operators')
        .select('id, venue_id')
        .eq('id', operatorId)
        .single()

      if (findError || !existing) {
        return next(createError(404, 'NOT_FOUND', 'Operator not found'))
      }

      if (existing.venue_id !== req.user!.venueId) {
        return next(createError(403, 'FORBIDDEN', 'Cannot delete operator from another venue'))
      }

      // Soft delete
      const { error: updateError } = await supabase
        .from('operators')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', operatorId)

      if (updateError) {
        return next(createError(500, 'DB_ERROR', 'Failed to deactivate operator'))
      }

      // Revoke all refresh tokens for this operator
      await supabase.from('refresh_tokens').delete().eq('operator_id', operatorId)

      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  },
)

export default router
