import { Router } from 'express'
import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import { analyticsQuerySchema } from '../../schemas/analytics'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// GET /api/v1/admin/analytics/summary — KPI cards data
router.get(
  '/api/v1/admin/analytics/summary',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = analyticsQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return next(
          createError(400, 'VALIDATION_ERROR', 'Invalid query params',
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message })),
          ),
        )
      }

      const venueId = req.user!.venueId
      const { startDate, endDate, operatorId } = parsed.data as { startDate?: string; endDate?: string; operatorId?: string }

      // Default: last 30 days
      const from = startDate || new Date(Date.now() - 30 * 86400000).toISOString()
      const to = endDate || new Date().toISOString()

      // Fetch sessions in range
      let sessQuery = supabase
        .from('sessions')
        .select('id, players_count, duration_actual, tokens_consumed, status, category, game_id, started_at')
        .eq('venue_id', venueId)
        .gte('started_at', from)
        .lte('started_at', to)

      if (operatorId) {
        // Verify operator belongs to the requesting admin's venue
        const { data: op } = await supabase
          .from('operators')
          .select('id')
          .eq('id', operatorId)
          .eq('venue_id', venueId)
          .single()

        if (!op) {
          return next(createError(403, 'FORBIDDEN', 'Operator does not belong to your venue'))
        }

        sessQuery = sessQuery.eq('operator_id', operatorId)
      }

      const { data: sessions, error: sessErr } = await sessQuery

      if (sessErr) {
        logger.error({ error: sessErr }, 'Failed to fetch analytics sessions')
        return next(createError(500, 'DB_ERROR', 'Failed to fetch analytics data'))
      }

      const rows = sessions || []
      const completed = rows.filter((s) => s.status === 'completed')

      // KPIs
      const totalSessions = rows.length
      const completedSessions = completed.length
      const totalTokens = completed.reduce((sum, s) => sum + (s.tokens_consumed || 0), 0)
      const totalPlayers = completed.reduce((sum, s) => sum + (s.players_count || 0), 0)
      const avgDuration = completed.length > 0
        ? Math.round(completed.reduce((sum, s) => sum + (s.duration_actual || 0), 0) / completed.length)
        : 0
      const errorCount = rows.filter((s) => s.status === 'error').length
      const cancelledCount = rows.filter((s) => s.status === 'cancelled').length

      // Top games (by session count)
      const gameCounts: Record<string, number> = {}
      for (const s of completed) {
        gameCounts[s.game_id] = (gameCounts[s.game_id] || 0) + 1
      }
      const topGames = Object.entries(gameCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([gameId, count]) => ({ gameId, count }))

      // Category breakdown
      const categoryBreakdown: Record<string, { sessions: number; tokens: number }> = {}
      for (const s of completed) {
        if (!categoryBreakdown[s.category]) {
          categoryBreakdown[s.category] = { sessions: 0, tokens: 0 }
        }
        categoryBreakdown[s.category].sessions += 1
        categoryBreakdown[s.category].tokens += s.tokens_consumed || 0
      }

      // Daily breakdown for chart
      const dailyMap: Record<string, { sessions: number; tokens: number; players: number }> = {}
      for (const s of rows) {
        const day = s.started_at.slice(0, 10) // YYYY-MM-DD
        if (!dailyMap[day]) {
          dailyMap[day] = { sessions: 0, tokens: 0, players: 0 }
        }
        dailyMap[day].sessions += 1
        if (s.status === 'completed') {
          dailyMap[day].tokens += s.tokens_consumed || 0
          dailyMap[day].players += s.players_count || 0
        }
      }
      const daily = Object.entries(dailyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({ date, ...data }))

      // Fetch game names for topGames
      const gameIds = topGames.map((g) => g.gameId)
      let gameNames: Record<string, string> = {}
      if (gameIds.length > 0) {
        const { data: games } = await supabase
          .from('game_configs')
          .select('id, name')
          .in('id', gameIds)

        if (games) {
          gameNames = Object.fromEntries(games.map((g) => [g.id, g.name]))
        }
      }

      res.json({
        period: { from, to },
        kpis: {
          totalSessions,
          completedSessions,
          totalTokens,
          totalPlayers,
          avgDuration,
          errorCount,
          cancelledCount,
        },
        topGames: topGames.map((g) => ({
          gameId: g.gameId,
          gameName: gameNames[g.gameId] || g.gameId.slice(0, 8),
          count: g.count,
        })),
        categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
          category,
          ...data,
        })),
        daily,
      })
    } catch (err) {
      next(err)
    }
  },
)

export default router
