import type { Request, Response, NextFunction } from 'express'
import { createError } from './errorHandler'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

function createRateLimiter(
  keyFn: (req: Request) => string,
  maxAttempts: number,
  windowMs: number,
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = keyFn(req)
    const now = Date.now()

    const entry = store.get(key)

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    entry.count++

    if (entry.count > maxAttempts) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return next(
        createError(429, 'RATE_LIMITED', `Too many requests. Try again in ${retryAfter}s`),
      )
    }

    next()
  }
}

/** Per-IP rate limit (for auth endpoints). */
export function rateLimit(maxAttempts: number, windowMs: number) {
  return createRateLimiter(
    (req) => `ip:${req.path}:${req.ip || req.socket.remoteAddress || 'unknown'}`,
    maxAttempts,
    windowMs,
  )
}

/** Per-venue rate limit (for authenticated endpoints). Falls back to IP if no user. */
export function venueRateLimit(maxAttempts = 100, windowMs = 60 * 1000) {
  return createRateLimiter(
    (req) => req.user?.venueId
      ? `venue:${req.user.venueId}`
      : `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`,
    maxAttempts,
    windowMs,
  )
}
