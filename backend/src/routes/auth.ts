import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../db/supabase.js'
import { requireOperator } from '../middleware/auth.js'

export const authRouter = Router()

// POST /auth/login
// Body: { username, password }
// Returns a JWT with userId, venueId, role, name
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' })
    return
  }

  const { data: operator, error } = await supabase
    .from('operators')
    .select('id, name, role, active, password_hash, venue_id, venues(id, name)')
    .eq('username', String(username))
    .eq('active', true)
    .single()

  if (error || !operator || !operator.password_hash) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(String(password), operator.password_hash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const venue = Array.isArray(operator.venues) ? operator.venues[0] : operator.venues as { id: string; name: string } | null

  const token = jwt.sign(
    {
      userId: operator.id,
      venueId: operator.venue_id,
      role: operator.role,
      name: operator.name,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '12h' }
  )

  res.json({
    token,
    expiresIn: 43200, // 12h in seconds
    user: {
      id: operator.id,
      name: operator.name,
      role: operator.role,
      venueId: operator.venue_id,
      venueName: venue?.name ?? null,
    },
  })
})

// GET /auth/me — returns current user info from JWT
authRouter.get('/me', requireOperator, (req, res) => {
  res.json({ user: req.operator })
})

// POST /auth/logout — stateless; client discards the token
authRouter.post('/logout', (_req, res) => {
  res.json({ success: true })
})
