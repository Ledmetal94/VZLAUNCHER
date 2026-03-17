import { Router } from 'express'
import { supabase } from '../../lib/supabase'
import { requireAuth, requireSuperAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import { analyticsQuerySchema } from '../../schemas/analytics'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// GET /api/v1/super-admin/analytics — cross-venue analytics
router.get(
  '/api/v1/super-admin/analytics',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = analyticsQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return next(createError(400, 'VALIDATION_ERROR', 'Invalid query params'))
      }

      const { startDate, endDate } = parsed.data as { startDate?: string; endDate?: string }
      const from = startDate || new Date(Date.now() - 30 * 86400000).toISOString()
      const to = endDate || new Date().toISOString()

      // Fetch all venues
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name, token_balance, status')
        .order('name')

      // Fetch all sessions in range (no venue filter)
      const { data: sessions, error: sessErr } = await supabase
        .from('sessions')
        .select('id, venue_id, players_count, duration_actual, tokens_consumed, status, started_at')
        .gte('started_at', from)
        .lte('started_at', to)

      if (sessErr) return next(createError(500, 'DB_ERROR', sessErr.message))

      const rows = sessions || []
      const completed = rows.filter((s) => s.status === 'completed')

      // Global KPIs
      const kpis = {
        totalVenues: (venues || []).length,
        activeVenues: (venues || []).filter((v) => v.status === 'active').length,
        totalSessions: rows.length,
        completedSessions: completed.length,
        totalTokens: completed.reduce((sum, s) => sum + (s.tokens_consumed || 0), 0),
        totalPlayers: completed.reduce((sum, s) => sum + (s.players_count || 0), 0),
        avgDuration: completed.length > 0
          ? Math.round(completed.reduce((sum, s) => sum + (s.duration_actual || 0), 0) / completed.length)
          : 0,
      }

      // Per-venue breakdown
      const venueMap: Record<string, { sessions: number; tokens: number; players: number }> = {}
      for (const s of rows) {
        if (!venueMap[s.venue_id]) {
          venueMap[s.venue_id] = { sessions: 0, tokens: 0, players: 0 }
        }
        venueMap[s.venue_id].sessions += 1
        if (s.status === 'completed') {
          venueMap[s.venue_id].tokens += s.tokens_consumed || 0
          venueMap[s.venue_id].players += s.players_count || 0
        }
      }

      const venueBreakdown = (venues || []).map((v) => ({
        venueId: v.id,
        venueName: v.name,
        status: v.status,
        tokenBalance: v.token_balance,
        sessions: venueMap[v.id]?.sessions || 0,
        tokens: venueMap[v.id]?.tokens || 0,
        players: venueMap[v.id]?.players || 0,
      }))

      // Daily aggregation
      const dailyMap: Record<string, { sessions: number; tokens: number }> = {}
      for (const s of rows) {
        const day = new Date(s.started_at).toISOString().slice(0, 10)
        if (!dailyMap[day]) dailyMap[day] = { sessions: 0, tokens: 0 }
        dailyMap[day].sessions += 1
        if (s.status === 'completed') {
          dailyMap[day].tokens += s.tokens_consumed || 0
        }
      }
      const daily = Object.entries(dailyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({ date, ...data }))

      res.json({ period: { from, to }, kpis, venueBreakdown, daily })
    } catch (err) {
      next(err)
    }
  },
)

export default router
