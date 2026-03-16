import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createError } from './errorHandler'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('Missing JWT_SECRET environment variable')

export interface JwtPayload {
  sub: string
  role: 'admin' | 'normal'
  venueId: string
}

declare module 'express' {
  interface Request {
    user?: JwtPayload
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(createError(401, 'UNAUTHORIZED', 'Missing or invalid token'))
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.user = payload
    next()
  } catch {
    next(createError(401, 'UNAUTHORIZED', 'Invalid or expired token'))
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return next(createError(403, 'FORBIDDEN', 'Admin access required'))
  }
  next()
}
