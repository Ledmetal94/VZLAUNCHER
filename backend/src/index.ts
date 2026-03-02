import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'
import { sessionsRouter } from './routes/sessions.js'
import { operatorsRouter } from './routes/operators.js'
import { venuesRouter } from './routes/venues.js'
import { gameConfigsRouter } from './routes/gameConfigs.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
const PORT = parseInt(process.env.PORT ?? '3002', 10)

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
]

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())
app.use(morgan('dev'))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/health', healthRouter)
app.use('/auth', authRouter)
app.use('/sessions', sessionsRouter)
app.use('/operators', operatorsRouter)
app.use('/venues', venuesRouter)
app.use('/game-configs', gameConfigsRouter)

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler)

// ─── Start (local dev only — Vercel uses the default export) ─────────────────
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🚀 VZLAUNCHER API running on port ${PORT}`)
    console.log(`   Env: ${process.env.NODE_ENV ?? 'development'}`)
    console.log(`   DB:  ${process.env.SUPABASE_URL ?? '(no SUPABASE_URL set)'}\n`)
  })
}

export default app
