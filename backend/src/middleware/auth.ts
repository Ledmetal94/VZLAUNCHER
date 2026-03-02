import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      operator?: {
        id: string
        name: string
        role: string
        venueId: string
      }
    }
  }
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
      userId: string
      venueId: string
      role: string
      name: string
    }
    req.operator = {
      id: payload.userId,
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
