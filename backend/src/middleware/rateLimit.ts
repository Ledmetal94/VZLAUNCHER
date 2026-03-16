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

export function rateLimit(maxAttempts: number, windowMs: number) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const key = `${req.path}:${ip}`
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
        createError(429, 'RATE_LIMITED', `Too many attempts. Try again in ${retryAfter}s`),
      )
    }

    next()
  }
}
