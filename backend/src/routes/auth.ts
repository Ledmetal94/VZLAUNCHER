import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { supabase } from '../lib/supabase'
import { loginSchema } from '../schemas/auth'
import { createError } from '../middleware/errorHandler'
import { rateLimit } from '../middleware/rateLimit'
import { requireAuth } from '../middleware/auth'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('Missing JWT_SECRET or JWT_REFRESH_SECRET environment variables')
}
const ACCESS_TOKEN_EXPIRY = '1h'
const REFRESH_TOKEN_DAYS = 7

function generateRefreshToken(): string {
  return crypto.randomUUID() + '-' + crypto.randomBytes(32).toString('hex')
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// POST /api/v1/auth/login
router.post(
  '/api/v1/auth/login',
  rateLimit(5, 60 * 1000),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { username, password } = parsed.data

      // Find operator by username
      const { data: operator, error } = await supabase
        .from('operators')
        .select('id, name, username, password_hash, role, venue_id, active')
        .eq('username', username)
        .single()

      if (error || !operator) {
        return next(createError(401, 'UNAUTHORIZED', 'Invalid username or password'))
      }

      if (!operator.active) {
        return next(createError(401, 'UNAUTHORIZED', 'Account is deactivated'))
      }

      // Verify password
      const valid = await bcrypt.compare(password, operator.password_hash)
      if (!valid) {
        return next(createError(401, 'UNAUTHORIZED', 'Invalid username or password'))
      }

      // Get venue name
      const { data: venue } = await supabase
        .from('venues')
        .select('name')
        .eq('id', operator.venue_id)
        .single()

      // Generate access token
      const accessToken = jwt.sign(
        { sub: operator.id, role: operator.role, venueId: operator.venue_id },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY },
      )

      // Generate and store refresh token
      const refreshToken = generateRefreshToken()
      const tokenHash = hashToken(refreshToken)
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

      await supabase.from('refresh_tokens').insert({
        operator_id: operator.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      })

      res.json({
        accessToken,
        user: {
          id: operator.id,
          name: operator.name,
          username: operator.username,
          role: operator.role,
          venueId: operator.venue_id,
          venueName: venue?.name || 'Unknown',
        },
      })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/auth/refresh
router.post(
  '/api/v1/auth/refresh',
  rateLimit(10, 60 * 1000),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken
      if (!refreshToken) {
        return next(createError(401, 'UNAUTHORIZED', 'No refresh token'))
      }

      const tokenHash = hashToken(refreshToken)

      // Find and validate refresh token
      const { data: tokenRecord, error } = await supabase
        .from('refresh_tokens')
        .select('id, operator_id, expires_at')
        .eq('token_hash', tokenHash)
        .single()

      if (error || !tokenRecord) {
        return next(createError(401, 'UNAUTHORIZED', 'Invalid refresh token'))
      }

      if (new Date(tokenRecord.expires_at) < new Date()) {
        await supabase.from('refresh_tokens').delete().eq('id', tokenRecord.id)
        return next(createError(401, 'UNAUTHORIZED', 'Refresh token expired'))
      }

      // Delete old token (rotation)
      await supabase.from('refresh_tokens').delete().eq('id', tokenRecord.id)

      // Get operator
      const { data: operator } = await supabase
        .from('operators')
        .select('id, name, username, role, venue_id, active')
        .eq('id', tokenRecord.operator_id)
        .single()

      if (!operator || !operator.active) {
        return next(createError(401, 'UNAUTHORIZED', 'Account not found or deactivated'))
      }

      // Issue new tokens
      const accessToken = jwt.sign(
        { sub: operator.id, role: operator.role, venueId: operator.venue_id },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY },
      )

      const newRefreshToken = generateRefreshToken()
      const newTokenHash = hashToken(newRefreshToken)
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

      await supabase.from('refresh_tokens').insert({
        operator_id: operator.id,
        token_hash: newTokenHash,
        expires_at: expiresAt.toISOString(),
      })

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      })

      res.json({ accessToken })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/auth/logout
router.post(
  '/api/v1/auth/logout',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken
      if (refreshToken) {
        const tokenHash = hashToken(refreshToken)
        await supabase.from('refresh_tokens').delete().eq('token_hash', tokenHash)
      }

      res.clearCookie('refreshToken', { path: '/api/v1/auth' })
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  },
)

export default router
