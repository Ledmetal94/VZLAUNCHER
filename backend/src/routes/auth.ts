import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../db/supabase.js'
import { requireVenueKey, requireOperator } from '../middleware/auth.js'

export const authRouter = Router()

// POST /auth/venue-login
// Body: { username, password }
// Returns a venue-level JWT — used as X-Api-Key replacement in operator auth
authRouter.post('/venue-login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' })
    return
  }

  const { data: venue, error } = await supabase
    .from('venues')
    .select('id, name, username, password_hash, timezone, currency, logo_url, api_key')
    .eq('username', String(username))
    .eq('active', true)
    .single()

  if (error || !venue || !venue.password_hash) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(String(password), venue.password_hash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = jwt.sign(
    { venueId: venue.id, type: 'venue' },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  )

  res.json({
    token,
    venue: {
      id: venue.id,
      name: venue.name,
      username: venue.username,
      timezone: venue.timezone,
      currency: venue.currency,
      logoUrl: venue.logo_url,
    },
  })
})

// POST /auth/login
// Body: { pin: string }
// Header: X-Api-Key (venue key)
authRouter.post('/login', requireVenueKey, async (req, res) => {
  const { pin } = req.body

  if (!pin) {
    res.status(400).json({ error: 'PIN is required' })
    return
  }

  const { data: operators, error } = await supabase
    .from('operators')
    .select('id, name, pin_hash, role, active')
    .eq('venue_id', req.venueId)
    .eq('active', true)

  if (error) {
    res.status(500).json({ error: 'Database error' })
    return
  }

  // Check PIN against all active operators for this venue
  let matched: { id: string; name: string; role: string } | null = null
  for (const op of operators ?? []) {
    const valid = await bcrypt.compare(String(pin), op.pin_hash)
    if (valid) {
      matched = { id: op.id, name: op.name, role: op.role }
      break
    }
  }

  if (!matched) {
    res.status(401).json({ error: 'Invalid PIN' })
    return
  }

  const token = jwt.sign(
    { operatorId: matched.id, venueId: req.venueId, role: matched.role, name: matched.name },
    process.env.JWT_SECRET!,
    { expiresIn: '12h' }
  )

  res.json({
    token,
    expiresIn: 43200, // 12h in seconds
    operator: { id: matched.id, name: matched.name, role: matched.role },
  })
})

// GET /auth/me — returns current operator info from JWT
authRouter.get('/me', requireVenueKey, requireOperator, (req, res) => {
  res.json({ operator: req.operator })
})

// POST /auth/logout — stateless; client discards the token
authRouter.post('/logout', (_req, res) => {
  res.json({ success: true })
})
