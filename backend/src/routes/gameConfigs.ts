import { Router } from 'express'
import { supabase } from '../db/supabase.js'
import { requireVenueKey, requireOperator, requireAdmin } from '../middleware/auth.js'

export const gameConfigsRouter = Router()
gameConfigsRouter.use(requireVenueKey)
gameConfigsRouter.use(requireOperator)

// GET /game-configs — fetch all game configs for this venue
gameConfigsRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('game_configs')
    .select('game_slug, enabled, launcher, price, updated_at')
    .eq('venue_id', req.venueId!)
    .order('game_slug')

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json(data)
})

// PUT /game-configs/:gameSlug — upsert config for a specific game (admin only)
gameConfigsRouter.put('/:gameSlug', requireAdmin, async (req, res) => {
  const { enabled, launcher, price } = req.body
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (enabled !== undefined) updates.enabled = Boolean(enabled)
  if (launcher !== undefined) updates.launcher = launcher
  if (price !== undefined) updates.price = price

  const { data, error } = await supabase
    .from('game_configs')
    .upsert(
      { venue_id: req.venueId!, game_slug: req.params.gameSlug, ...updates },
      { onConflict: 'venue_id,game_slug' }
    )
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json(data)
})

// POST /game-configs/reset — delete all custom configs for this venue (reverts to defaults)
gameConfigsRouter.post('/reset', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('game_configs')
    .delete()
    .eq('venue_id', req.venueId!)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json({ success: true, message: 'Game configs reset to defaults' })
})
