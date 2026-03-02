import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../db/supabase.js'
import { requireAdmin } from '../middleware/auth.js'

export const operatorsRouter = Router()
operatorsRouter.use(requireAdmin)

// GET /operators — list all users in this venue
operatorsRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('operators')
    .select('id, name, username, role, active, created_at')
    .eq('venue_id', req.operator!.venueId)
    .order('name')

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json(data)
})

// POST /operators — create new user
operatorsRouter.post('/', async (req, res) => {
  const { name, username, password, role = 'normal' } = req.body

  if (!name || !username || !password) {
    res.status(400).json({ error: 'name, username and password are required' })
    return
  }
  if (!['normal', 'admin'].includes(role)) {
    res.status(400).json({ error: 'role must be "normal" or "admin"' })
    return
  }

  const password_hash = await bcrypt.hash(String(password), 10)

  const { data, error } = await supabase
    .from('operators')
    .insert({
      venue_id: req.operator!.venueId,
      name,
      username,
      password_hash,
      pin_hash: password_hash, // keep column non-null for legacy constraint
      role,
      active: true,
    })
    .select('id, name, username, role, active, created_at')
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(201).json(data)
})

// PUT /operators/:id — update name, username, password, or role
operatorsRouter.put('/:id', async (req, res) => {
  const { name, username, password, role } = req.body
  const updates: Record<string, unknown> = {}

  if (name !== undefined) updates.name = name
  if (username !== undefined) updates.username = username
  if (role !== undefined) {
    if (!['normal', 'admin'].includes(role)) {
      res.status(400).json({ error: 'role must be "normal" or "admin"' })
      return
    }
    updates.role = role
  }
  if (password !== undefined) {
    const hash = await bcrypt.hash(String(password), 10)
    updates.password_hash = hash
    updates.pin_hash = hash // keep in sync
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No fields to update' })
    return
  }

  const { data, error } = await supabase
    .from('operators')
    .update(updates)
    .eq('id', req.params.id)
    .eq('venue_id', req.operator!.venueId)
    .select('id, name, username, role, active, created_at')
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'User not found' })
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
    .eq('venue_id', req.operator!.venueId)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json({ success: true })
})

// GET /operators/:id/stats — session stats for one user
operatorsRouter.get('/:id/stats', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('duration_seconds, price, start_time')
    .eq('operator_id', req.params.id)
    .eq('venue_id', req.operator!.venueId)
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
