import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import { createSessionSchema, listSessionsSchema } from '../schemas/sessions'
import { createError } from '../middleware/errorHandler'
import { requireAuth } from '../middleware/auth'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// POST /api/v1/sessions — record a completed session
router.post(
  '/api/v1/sessions',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createSessionSchema.safeParse(req.body)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid session data',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { gameId, platform, category, playersCount, durationPlanned, durationActual, tokensConsumed, status, errorLog, startedAt, endedAt } = parsed.data
      const venueId = req.user!.venueId
      const operatorId = req.user!.sub

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          venue_id: venueId,
          game_id: gameId,
          operator_id: operatorId,
          platform,
          category,
          players_count: playersCount,
          duration_planned: durationPlanned,
          duration_actual: durationActual,
          tokens_consumed: tokensConsumed,
          status,
          error_log: errorLog || null,
          started_at: startedAt,
          ended_at: endedAt,
        })
        .select('id, venue_id, game_id, operator_id, platform, category, players_count, duration_planned, duration_actual, tokens_consumed, status, error_log, started_at, ended_at')
        .single()

      if (error) {
        logger.error({ error }, 'Failed to create session')
        return next(createError(500, 'DB_ERROR', 'Failed to create session'))
      }

      res.status(201).json({
        id: session.id,
        venueId: session.venue_id,
        gameId: session.game_id,
        operatorId: session.operator_id,
        platform: session.platform,
        category: session.category,
        playersCount: session.players_count,
        durationPlanned: session.duration_planned,
        durationActual: session.duration_actual,
        tokensConsumed: session.tokens_consumed,
        status: session.status,
        errorLog: session.error_log,
        startedAt: session.started_at,
        endedAt: session.ended_at,
      })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/sessions — list sessions for venue
router.get(
  '/api/v1/sessions',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listSessionsSchema.safeParse(req.query)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid query parameters',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const { page, pageSize, sort, order, startDate, endDate, operatorId, category, status } = parsed.data
      const venueId = req.user!.venueId
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Get total count
      let countQuery = supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venueId)
      if (startDate) countQuery = countQuery.gte('started_at', startDate)
      if (endDate) countQuery = countQuery.lte('started_at', endDate)
      if (operatorId) countQuery = countQuery.eq('operator_id', operatorId)
      if (category) countQuery = countQuery.eq('category', category)
      if (status) countQuery = countQuery.eq('status', status)

      const { count, error: countError } = await countQuery

      if (countError) {
        return next(createError(500, 'DB_ERROR', countError.message))
      }

      // Get paginated data
      let dataQuery = supabase
        .from('sessions')
        .select('id, venue_id, game_id, operator_id, platform, category, players_count, duration_planned, duration_actual, tokens_consumed, status, error_log, started_at, ended_at')
        .eq('venue_id', venueId)
      if (startDate) dataQuery = dataQuery.gte('started_at', startDate)
      if (endDate) dataQuery = dataQuery.lte('started_at', endDate)
      if (operatorId) dataQuery = dataQuery.eq('operator_id', operatorId)
      if (category) dataQuery = dataQuery.eq('category', category)
      if (status) dataQuery = dataQuery.eq('status', status)

      const { data: rows, error } = await dataQuery
        .order(sort, { ascending: order === 'asc' })
        .range(from, to)

      if (error) {
        logger.error({ error }, 'Failed to list sessions')
        return next(createError(500, 'DB_ERROR', 'Failed to fetch sessions'))
      }

      const data = (rows || []).map((s) => ({
        id: s.id,
        venueId: s.venue_id,
        gameId: s.game_id,
        operatorId: s.operator_id,
        platform: s.platform,
        category: s.category,
        playersCount: s.players_count,
        durationPlanned: s.duration_planned,
        durationActual: s.duration_actual,
        tokensConsumed: s.tokens_consumed,
        status: s.status,
        errorLog: s.error_log,
        startedAt: s.started_at,
        endedAt: s.ended_at,
      }))

      res.json({
        data,
        total: count || 0,
        page,
        pageSize,
      })
    } catch (err) {
      next(err)
    }
  },
)

export default router
