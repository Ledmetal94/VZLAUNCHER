import { Router } from 'express'
import { supabase } from '../../lib/supabase'
import { requireAuth, requireSuperAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import { venueGamesBodySchema } from '../../schemas/superAdmin'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

interface VenueGameRow {
  game_id: string
  enabled: boolean
}

// GET /api/v1/super-admin/venues/:id/games — list games with enabled status for a venue
router.get(
  '/api/v1/super-admin/venues/:id/games',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = req.params.id

      // Get all games
      const { data: allGames, error: gamesError } = await supabase
        .from('game_configs')
        .select('id, name, platform, category, enabled')
        .order('name')

      if (gamesError) return next(createError(500, 'DB_ERROR', 'Failed to fetch games'))

      // Get venue-game mappings
      const { data: venueGames, error: vgError } = await supabase
        .from('venue_games')
        .select('game_id, enabled')
        .eq('venue_id', venueId) as { data: VenueGameRow[] | null; error: unknown }

      if (vgError) return next(createError(500, 'DB_ERROR', 'Failed to fetch venue games'))

      const enabledMap = new Map((venueGames || []).map((vg) => [vg.game_id, vg.enabled]))

      // Merge: if no mapping exists, default to true (new games are enabled by default)
      const games = (allGames || []).map((g) => ({
        id: g.id,
        name: g.name,
        platform: g.platform,
        category: g.category,
        globalEnabled: g.enabled,
        venueEnabled: enabledMap.has(g.id) ? enabledMap.get(g.id)! : true,
      }))

      res.json({ games })
    } catch (err) {
      next(err)
    }
  },
)

// PUT /api/v1/super-admin/venues/:id/games — bulk update venue game toggles
router.put(
  '/api/v1/super-admin/venues/:id/games',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = req.params.id
      const parsed = venueGamesBodySchema.safeParse(req.body)
      if (!parsed.success) {
        return next(createError(400, 'VALIDATION_ERROR', 'Invalid request',
          parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))))
      }
      const { games } = parsed.data

      // Upsert all mappings
      const rows = games.map((g) => ({
        venue_id: venueId,
        game_id: g.gameId,
        enabled: g.enabled,
      }))

      const { error } = await supabase
        .from('venue_games')
        .upsert(rows, { onConflict: 'venue_id,game_id' })

      if (error) return next(createError(500, 'DB_ERROR', 'Failed to update venue games'))

      res.json({ success: true, updated: rows.length })
    } catch (err) {
      next(err)
    }
  },
)

export default router
