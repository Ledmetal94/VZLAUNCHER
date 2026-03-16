import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// GET /api/v1/games — list enabled games
router.get(
  '/api/v1/games',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabase
        .from('game_configs')
        .select('*')
        .eq('enabled', true)
        .order('name', { ascending: true })

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to fetch games'))
      }

      res.json({ games: data })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/games/:id — single game
router.get(
  '/api/v1/games/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabase
        .from('game_configs')
        .select('*')
        .eq('id', req.params.id)
        .eq('enabled', true)
        .single()

      if (error || !data) {
        return next(createError(404, 'NOT_FOUND', 'Game not found'))
      }

      res.json({ game: data })
    } catch (err) {
      next(err)
    }
  },
)

export default router
