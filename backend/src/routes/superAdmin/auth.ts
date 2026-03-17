import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { supabase } from '../../lib/supabase'
import { createError } from '../../middleware/errorHandler'
import { rateLimit } from '../../middleware/rateLimit'
import { loginSchema } from '../../schemas/auth'
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

// POST /api/v1/super-admin/auth/login
router.post(
  '/api/v1/super-admin/auth/login',
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

      const { data: admin, error } = await supabase
        .from('super_admins')
        .select('id, name, username, password_hash, active')
        .eq('username', username)
        .single()

      if (error || !admin) {
        return next(createError(401, 'UNAUTHORIZED', 'Invalid username or password'))
      }

      if (!admin.active) {
        return next(createError(401, 'UNAUTHORIZED', 'Account is deactivated'))
      }

      const valid = await bcrypt.compare(password, admin.password_hash)
      if (!valid) {
        return next(createError(401, 'UNAUTHORIZED', 'Invalid username or password'))
      }

      const accessToken = jwt.sign(
        { sub: admin.id, role: 'super_admin', venueId: null },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY },
      )

      const refreshToken = generateRefreshToken()
      const tokenHash = hashToken(refreshToken)
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

      await supabase.from('refresh_tokens').insert({
        super_admin_id: admin.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        path: '/api/v1',
      })

      res.json({
        accessToken,
        user: {
          id: admin.id,
          name: admin.name,
          username: admin.username,
          role: 'super_admin' as const,
          venueId: null,
          venueName: null,
        },
      })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/super-admin/auth/refresh
router.post(
  '/api/v1/super-admin/auth/refresh',
  rateLimit(10, 60 * 1000),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken
      if (!refreshToken) {
        return next(createError(401, 'UNAUTHORIZED', 'No refresh token'))
      }

      const tokenHash = hashToken(refreshToken)

      const { data: tokenRecord, error } = await supabase
        .from('refresh_tokens')
        .select('id, super_admin_id, expires_at')
        .eq('token_hash', tokenHash)
        .not('super_admin_id', 'is', null)
        .single()

      if (error || !tokenRecord) {
        return next(createError(401, 'UNAUTHORIZED', 'Invalid refresh token'))
      }

      if (new Date(tokenRecord.expires_at) < new Date()) {
        await supabase.from('refresh_tokens').delete().eq('id', tokenRecord.id)
        return next(createError(401, 'UNAUTHORIZED', 'Refresh token expired'))
      }

      await supabase.from('refresh_tokens').delete().eq('id', tokenRecord.id)

      const { data: admin } = await supabase
        .from('super_admins')
        .select('id, name, username, active')
        .eq('id', tokenRecord.super_admin_id)
        .single()

      if (!admin || !admin.active) {
        return next(createError(401, 'UNAUTHORIZED', 'Account not found or deactivated'))
      }

      const accessToken = jwt.sign(
        { sub: admin.id, role: 'super_admin', venueId: null },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY },
      )

      const newRefreshToken = generateRefreshToken()
      const newTokenHash = hashToken(newRefreshToken)
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

      await supabase.from('refresh_tokens').insert({
        super_admin_id: admin.id,
        token_hash: newTokenHash,
        expires_at: expiresAt.toISOString(),
      })

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        path: '/api/v1',
      })

      res.json({ accessToken })
    } catch (err) {
      next(err)
    }
  },
)

export default router
