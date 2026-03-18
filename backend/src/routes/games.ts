import { Router } from 'express'
import crypto from 'crypto'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// GET /api/v1/games — list enabled games with ETag support
router.get(
  '/api/v1/games',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data: allGames, error } = await supabase
        .from('game_configs')
        .select('*')
        .eq('enabled', true)
        .order('name', { ascending: true })

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to fetch games'))
      }

      let games = allGames || []

      // Filter by venue-specific game enablement (skip for super-admins)
      const venueId = req.user?.venueId
      if (venueId) {
        const { data: venueGames, error: vgError } = await supabase
          .from('venue_games')
          .select('game_id')
          .eq('venue_id', venueId)
          .eq('enabled', false)

        if (vgError) {
          return next(createError(500, 'DB_ERROR', 'Failed to fetch venue game settings'))
        }

        if (venueGames && venueGames.length > 0) {
          const disabledIds = new Set(venueGames.map((vg) => vg.game_id))
          games = games.filter((g) => !disabledIds.has(g.id))
        }
      }

      // Generate ETag from data content
      const hash = crypto.createHash('md5').update(JSON.stringify(games)).digest('hex')
      const etag = `"${hash}"`

      // Check If-None-Match header
      const ifNoneMatch = req.headers['if-none-match']
      if (ifNoneMatch === etag) {
        return res.status(304).end()
      }

      res.setHeader('ETag', etag)
      res.json({ games })
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
