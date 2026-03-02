import { Router } from 'express'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { supabase } from '../db/supabase.js'
import { requireSuperAdmin } from '../middleware/auth.js'

export const venuesRouter = Router()
venuesRouter.use(requireSuperAdmin)

// GET /venues — list all venues
venuesRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, city, country, timezone, currency, active, created_at')
    .order('name')

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json(data)
})

// POST /venues — provision a new venue (creates default admin operator)
venuesRouter.post('/', async (req, res) => {
  const {
    name,
    city = null,
    country = 'IT',
    timezone = 'Europe/Rome',
    currency = 'EUR',
    initialAdminPin = '0000',
  } = req.body

  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  const api_key = randomUUID()

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .insert({ name, city, country, timezone, currency, api_key, active: true })
    .select()
    .single()

  if (venueError || !venue) {
    res.status(500).json({ error: venueError?.message ?? 'Failed to create venue' })
    return
  }

  // Auto-create admin operator
  const pin_hash = await bcrypt.hash(String(initialAdminPin), 10)
  await supabase.from('operators').insert({
    venue_id: venue.id,
    name: 'Admin',
    pin_hash,
    role: 'admin',
    active: true,
  })

  // api_key returned only on creation — store it securely
  res.status(201).json({ ...venue, api_key })
})

// PUT /venues/:id — update venue info
venuesRouter.put('/:id', async (req, res) => {
  const { name, city, country, timezone, currency, logo_url } = req.body
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (city !== undefined) updates.city = city
  if (country !== undefined) updates.country = country
  if (timezone !== undefined) updates.timezone = timezone
  if (currency !== undefined) updates.currency = currency
  if (logo_url !== undefined) updates.logo_url = logo_url

  const { data, error } = await supabase
    .from('venues')
    .update(updates)
    .eq('id', req.params.id)
    .select('id, name, city, country, timezone, currency, logo_url, active')
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'Venue not found' })
    return
  }
  res.json(data)
})

// DELETE /venues/:id — soft delete
venuesRouter.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('venues')
    .update({ active: false })
    .eq('id', req.params.id)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json({ success: true })
})

// POST /venues/:id/rotate-key — generate new API key (invalidates old one)
venuesRouter.post('/:id/rotate-key', async (req, res) => {
  const api_key = randomUUID()

  const { error } = await supabase
    .from('venues')
    .update({ api_key })
    .eq('id', req.params.id)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json({ api_key })
})

// GET /venues/:id/stats — summary across all operators
venuesRouter.get('/:id/stats', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('duration_seconds, price, operator_id, game_slug')
    .eq('venue_id', req.params.id)
    .not('end_time', 'is', null)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  const sessions = data ?? []
  res.json({
    totalSessions: sessions.length,
    totalRevenue: Math.round(sessions.reduce((s, r) => s + (r.price ?? 0), 0) * 100) / 100,
    uniqueOperators: new Set(sessions.map((s) => s.operator_id)).size,
    uniqueGames: new Set(sessions.map((s) => s.game_slug)).size,
  })
})
