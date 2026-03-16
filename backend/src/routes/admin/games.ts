import { Router } from 'express'
import { supabase } from '../../lib/supabase'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import { createGameSchema, updateGameSchema } from '../../schemas/games'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// POST /api/v1/admin/games — create game
router.post(
  '/api/v1/admin/games',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createGameSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { data, error } = await supabase
        .from('game_configs')
        .insert(parsed.data)
        .select()
        .single()

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to create game'))
      }

      res.status(201).json({ game: data })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/v1/admin/games/:id — update game
router.patch(
  '/api/v1/admin/games/:id',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateGameSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      // Check game exists
      const { data: existing } = await supabase
        .from('game_configs')
        .select('id')
        .eq('id', req.params.id)
        .single()

      if (!existing) {
        return next(createError(404, 'NOT_FOUND', 'Game not found'))
      }

      const { data, error } = await supabase
        .from('game_configs')
        .update(parsed.data)
        .eq('id', req.params.id)
        .select()
        .single()

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to update game'))
      }

      res.json({ game: data })
    } catch (err) {
      next(err)
    }
  },
)

export default router
