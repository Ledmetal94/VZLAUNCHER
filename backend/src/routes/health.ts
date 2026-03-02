import { Router } from 'express'
import { supabase } from '../db/supabase.js'

export const healthRouter = Router()

healthRouter.get('/', async (_req, res) => {
  const { error } = await supabase.from('venues').select('id').limit(1)
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    db: error ? 'unreachable' : 'ok',
  })
})
