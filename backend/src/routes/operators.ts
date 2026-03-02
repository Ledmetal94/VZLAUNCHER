import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../db/supabase.js'
import { requireVenueKey, requireAdmin } from '../middleware/auth.js'

export const operatorsRouter = Router()
operatorsRouter.use(requireVenueKey)
operatorsRouter.use(requireAdmin)

// GET /operators — list all operators in this venue
operatorsRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('operators')
    .select('id, name, role, active, created_at')
    .eq('venue_id', req.venueId!)
    .order('name')

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json(data)
})

// POST /operators — create new operator
operatorsRouter.post('/', async (req, res) => {
  const { name, pin, role = 'operator' } = req.body

  if (!name || !pin) {
    res.status(400).json({ error: 'name and pin are required' })
    return
  }
  if (!['operator', 'admin'].includes(role)) {
    res.status(400).json({ error: 'role must be "operator" or "admin"' })
    return
  }

  const pin_hash = await bcrypt.hash(String(pin), 10)

  const { data, error } = await supabase
    .from('operators')
    .insert({ venue_id: req.venueId!, name, pin_hash, role, active: true })
    .select('id, name, role, active, created_at')
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(201).json(data)
})

// PUT /operators/:id — update name, PIN, or role
operatorsRouter.put('/:id', async (req, res) => {
  const { name, pin, role } = req.body
  const updates: Record<string, unknown> = {}

  if (name !== undefined) updates.name = name
  if (role !== undefined) {
    if (!['operator', 'admin'].includes(role)) {
      res.status(400).json({ error: 'role must be "operator" or "admin"' })
      return
    }
    updates.role = role
  }
  if (pin !== undefined) updates.pin_hash = await bcrypt.hash(String(pin), 10)

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No fields to update' })
    return
  }

  const { data, error } = await supabase
    .from('operators')
    .update(updates)
    .eq('id', req.params.id)
    .eq('venue_id', req.venueId!)
    .select('id, name, role, active, created_at')
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'Operator not found' })
    return
  }
  res.json(data)
})

// DELETE /operators/:id — soft delete (sets active = false)
operatorsRouter.delete('/:id', async (req, res) => {
  if (req.params.id === req.operator!.id) {
    res.status(400).json({ error: 'Cannot deactivate your own account' })
    return
  }

  const { error } = await supabase
    .from('operators')
    .update({ active: false })
    .eq('id', req.params.id)
    .eq('venue_id', req.venueId!)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json({ success: true })
})

// GET /operators/:id/stats — session stats for one operator
operatorsRouter.get('/:id/stats', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('duration_seconds, price, start_time')
    .eq('operator_id', req.params.id)
    .eq('venue_id', req.venueId!)
    .not('end_time', 'is', null)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  const sessions = data ?? []
  res.json({
    totalSessions: sessions.length,
    totalRevenue: Math.round(sessions.reduce((s, r) => s + (r.price ?? 0), 0) * 100) / 100,
    avgDurationSeconds: sessions.length
      ? Math.round(sessions.reduce((s, r) => s + (r.duration_seconds ?? 0), 0) / sessions.length)
      : 0,
    lastActive: sessions[0]?.start_time ?? null,
  })
})
