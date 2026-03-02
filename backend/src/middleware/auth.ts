import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../db/supabase.js'

// ─── Venue authentication ─────────────────────────────────────────────────────
// Accepts either:
//   - X-Api-Key: <venue-jwt>  (new — issued by POST /auth/venue-login)
//   - X-Api-Key: <uuid>       (legacy — static api_key UUID, kept for bridge compat)
export async function requireVenueKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string | undefined

  if (!apiKey) {
    res.status(403).json({ error: 'Missing X-Api-Key header' })
    return
  }

  // Try to decode as venue JWT first
  try {
    const payload = jwt.verify(apiKey, process.env.JWT_SECRET!) as {
      venueId: string
      type: string
    }
    if (payload.type === 'venue' && payload.venueId) {
      req.venueId = payload.venueId
      return next()
    }
  } catch {
    // Not a venue JWT — fall through to UUID lookup
  }

  // Legacy: UUID api_key lookup
  const { data: venue, error } = await supabase
    .from('venues')
    .select('id')
    .eq('api_key', apiKey)
    .eq('active', true)
    .single()

  if (error || !venue) {
    res.status(403).json({ error: 'Invalid or inactive API key' })
    return
  }

  req.venueId = venue.id
  next()
}

// ─── Operator JWT ─────────────────────────────────────────────────────────────
// After login the PWA receives a JWT. Include it as: Authorization: Bearer <token>
export function requireOperator(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      operatorId: string
      venueId: string
      role: string
      name: string
    }
    req.operator = {
      id: payload.operatorId,
      name: payload.name,
      role: payload.role,
      venueId: payload.venueId,
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// ─── Admin gate ───────────────────────────────────────────────────────────────
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireOperator(req, res, () => {
    if (req.operator?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    next()
  })
}

// ─── Super-admin gate (VZ company level) ─────────────────────────────────────
// Used only for venue provisioning. Pass SUPER_ADMIN_SECRET in X-Super-Admin-Secret header.
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-super-admin-secret']
  if (!process.env.SUPER_ADMIN_SECRET || secret !== process.env.SUPER_ADMIN_SECRET) {
    res.status(403).json({ error: 'Super admin access required' })
    return
  }
  next()
}
