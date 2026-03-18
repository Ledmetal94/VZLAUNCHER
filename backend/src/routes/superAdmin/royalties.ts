import { Router } from 'express'
import { supabase } from '../../lib/supabase'
import { requireAuth, requireSuperAdmin } from '../../middleware/auth'
import { createError } from '../../middleware/errorHandler'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// Default revenue rate per token (€)
const DEFAULT_TOKEN_RATE = 0.50

// GET /api/v1/super-admin/royalties?month=2026-03 — monthly per-venue royalty report
router.get(
  '/api/v1/super-admin/royalties',
  requireAuth,
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const monthParam = req.query.month as string
      // Default to current month
      const now = new Date()
      const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
        ? monthParam
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const startDate = `${month}-01T00:00:00.000Z`
      // End of month: parse year/month, go to next month day 1
      const [y, m] = month.split('-').map(Number)
      const endDate = new Date(y, m, 1).toISOString() // first day of next month

      // Get all consume transactions for the month, grouped by venue
      const { data: txData, error: txError } = await supabase
        .from('token_transactions')
        .select('venue_id, amount')
        .eq('type', 'consume')
        .eq('status', 'confirmed')
        .gte('created_at', startDate)
        .lt('created_at', endDate)

      if (txError) {
        return next(createError(500, 'DB_ERROR', 'Failed to fetch transactions'))
      }

      // Get session counts per venue for the month
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('venue_id, id')
        .gte('started_at', startDate)
        .lt('started_at', endDate)

      if (sessionError) {
        return next(createError(500, 'DB_ERROR', 'Failed to fetch sessions'))
      }

      // Get all venues
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name, status, default_token_cost')

      const venueMap = new Map((venues || []).map((v) => [v.id, v]))

      // Aggregate by venue
      const venueAgg: Record<string, { tokens: number; sessions: number }> = {}

      for (const tx of txData || []) {
        if (!venueAgg[tx.venue_id]) venueAgg[tx.venue_id] = { tokens: 0, sessions: 0 }
        venueAgg[tx.venue_id].tokens += Math.abs(tx.amount)
      }

      for (const s of sessionData || []) {
        if (!venueAgg[s.venue_id]) venueAgg[s.venue_id] = { tokens: 0, sessions: 0 }
        venueAgg[s.venue_id].sessions += 1
      }

      // Build report rows
      const tokenRate = parseFloat(req.query.rate as string) || DEFAULT_TOKEN_RATE
      let totalTokens = 0
      let totalSessions = 0
      let totalRevenue = 0

      const breakdown = Object.entries(venueAgg)
        .map(([venueId, agg]) => {
          const venue = venueMap.get(venueId)
          const revenue = agg.tokens * tokenRate
          totalTokens += agg.tokens
          totalSessions += agg.sessions
          totalRevenue += revenue
          return {
            venueId,
            venueName: venue?.name || venueId.slice(0, 8),
            status: venue?.status || 'unknown',
            sessions: agg.sessions,
            tokensConsumed: agg.tokens,
            revenue: Math.round(revenue * 100) / 100,
          }
        })
        .sort((a, b) => b.tokensConsumed - a.tokensConsumed)

      res.json({
        month,
        tokenRate,
        totals: {
          venues: breakdown.length,
          sessions: totalSessions,
          tokensConsumed: totalTokens,
          revenue: Math.round(totalRevenue * 100) / 100,
        },
        breakdown,
      })
    } catch (err) {
      next(err)
    }
  },
)

export default router
