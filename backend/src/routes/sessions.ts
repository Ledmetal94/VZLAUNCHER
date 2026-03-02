import { Router } from 'express'
import { supabase } from '../db/supabase.js'
import { requireOperator } from '../middleware/auth.js'

export const sessionsRouter = Router()
sessionsRouter.use(requireOperator)

// POST /sessions — save a completed session (idempotent via upsert on id)
sessionsRouter.post('/', async (req, res) => {
  const {
    id,
    gameId,
    gameSlug,
    gameName,
    launcher,
    difficulty,
    startTime,
    endTime,
    durationSeconds,
    price,
    notes,
  } = req.body

  if (!id || !gameSlug || !startTime) {
    res.status(400).json({ error: 'id, gameSlug and startTime are required' })
    return
  }

  const venueId = req.operator!.venueId

  const { data, error } = await supabase
    .from('sessions')
    .upsert(
      {
        id,
        venue_id: venueId,
        operator_id: req.operator!.id,
        game_id: gameId ?? null,
        game_slug: gameSlug,
        game_name: gameName ?? gameSlug,
        launcher: launcher ?? null,
        difficulty: difficulty ?? null,
        start_time: new Date(startTime).toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : null,
        duration_seconds: durationSeconds ?? null,
        price: price ?? null,
        notes: notes ?? null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(201).json(data)
})

// GET /sessions — list sessions for this venue (paginated)
sessionsRouter.get('/', async (req, res) => {
  const { startDate, endDate, gameSlug, operatorId, page = '1', limit = '20' } = req.query
  const venueId = req.operator!.venueId

  let query = supabase
    .from('sessions')
    .select('*', { count: 'exact' })
    .eq('venue_id', venueId)
    .order('start_time', { ascending: false })

  if (operatorId) {
    query = query.eq('operator_id', String(operatorId))
  }

  if (gameSlug) query = query.eq('game_slug', String(gameSlug))
  if (startDate) query = query.gte('start_time', new Date(String(startDate)).toISOString())
  if (endDate) query = query.lte('start_time', new Date(String(endDate)).toISOString())

  const pageNum = Math.max(1, parseInt(String(page)))
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))))
  query = query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1)

  const { data, error, count } = await query
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ data, total: count ?? 0, page: pageNum, limit: limitNum })
})

// GET /sessions/stats — aggregated analytics
sessionsRouter.get('/stats', async (req, res) => {
  const { startDate, endDate, gameSlug, operatorId } = req.query
  const venueId = req.operator!.venueId

  let query = supabase
    .from('sessions')
    .select('game_slug, game_name, operator_id, duration_seconds, price, start_time')
    .eq('venue_id', venueId)
    .not('end_time', 'is', null)

  if (operatorId) {
    query = query.eq('operator_id', String(operatorId))
  }

  if (gameSlug) query = query.eq('game_slug', String(gameSlug))
  if (startDate) query = query.gte('start_time', new Date(String(startDate)).toISOString())
  if (endDate) query = query.lte('start_time', new Date(String(endDate)).toISOString())

  const { data, error } = await query
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  const sessions = data ?? []
  const totalRevenue = sessions.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const avgDuration = sessions.length
    ? sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / sessions.length
    : 0

  const byGameMap: Record<string, { slug: string; name: string; count: number; revenue: number; totalDuration: number }> = {}
  for (const s of sessions) {
    if (!byGameMap[s.game_slug]) {
      byGameMap[s.game_slug] = { slug: s.game_slug, name: s.game_name, count: 0, revenue: 0, totalDuration: 0 }
    }
    byGameMap[s.game_slug].count++
    byGameMap[s.game_slug].revenue += s.price ?? 0
    byGameMap[s.game_slug].totalDuration += s.duration_seconds ?? 0
  }

  const byOperatorMap: Record<string, { id: string; count: number; revenue: number }> = {}
  for (const s of sessions) {
    if (!byOperatorMap[s.operator_id]) {
      byOperatorMap[s.operator_id] = { id: s.operator_id, count: 0, revenue: 0 }
    }
    byOperatorMap[s.operator_id].count++
    byOperatorMap[s.operator_id].revenue += s.price ?? 0
  }

  const byDayMap: Record<string, { date: string; count: number; revenue: number }> = {}
  for (const s of sessions) {
    const day = s.start_time.slice(0, 10)
    if (!byDayMap[day]) byDayMap[day] = { date: day, count: 0, revenue: 0 }
    byDayMap[day].count++
    byDayMap[day].revenue += s.price ?? 0
  }

  res.json({
    totalSessions: sessions.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgDurationSeconds: Math.round(avgDuration),
    byGame: Object.values(byGameMap).sort((a, b) => b.count - a.count),
    byOperator: Object.values(byOperatorMap),
    byDay: Object.values(byDayMap).sort((a, b) => a.date.localeCompare(b.date)),
  })
})

// GET /sessions/:id — single session detail
sessionsRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', req.params.id)
    .eq('venue_id', req.operator!.venueId)
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  res.json(data)
})
