import { Router } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import path from 'path'
import { supabase } from '../../lib/supabase'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import { createGameSchema, updateGameSchema } from '../../schemas/games'
import type { Request, Response, NextFunction } from 'express'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

const router = Router()

// POST /api/v1/admin/games/upload — upload game thumbnail to Supabase Storage
router.post(
  '/api/v1/admin/games/upload',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(createError(400, 'VALIDATION_ERROR', 'No file provided or invalid format (JPG/PNG/WebP, max 2MB)'))
      }

      const rawExt = path.extname(req.file.originalname).toLowerCase()
      const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp']
      const ext = ALLOWED_EXTS.includes(rawExt) ? rawExt : '.jpg'
      const filename = `${crypto.randomUUID()}${ext}`
      const storagePath = `game-thumbnails/${filename}`

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        })

      if (uploadError) {
        return next(createError(500, 'STORAGE_ERROR', 'Failed to upload image'))
      }

      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(storagePath)

      res.json({ url: urlData.publicUrl })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/admin/games — list all games (including disabled)
router.get(
  '/api/v1/admin/games',
  requireAuth,
  requireAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabase
        .from('game_configs')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to fetch games'))
      }

      res.json({ games: data })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/admin/games — create game
router.post(
  '/api/v1/admin/games',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createGameSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { data, error } = await supabase
        .from('game_configs')
        .insert(parsed.data)
        .select()
        .single()

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to create game'))
      }

      res.status(201).json({ game: data })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/v1/admin/games/:id — update game
router.patch(
  '/api/v1/admin/games/:id',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateGameSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid request',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      // Check game exists
      const { data: existing } = await supabase
        .from('game_configs')
        .select('id')
        .eq('id', req.params.id)
        .single()

      if (!existing) {
        return next(createError(404, 'NOT_FOUND', 'Game not found'))
      }

      const { data, error } = await supabase
        .from('game_configs')
        .update(parsed.data)
        .eq('id', req.params.id)
        .select()
        .single()

      if (error) {
        return next(createError(500, 'DB_ERROR', 'Failed to update game'))
      }

      res.json({ game: data })
    } catch (err) {
      next(err)
    }
  },
)

export default router
