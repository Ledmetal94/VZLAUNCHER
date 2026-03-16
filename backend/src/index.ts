import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { logger } from './lib/logger'
import { errorHandler } from './middleware/errorHandler'
import healthRouter from './routes/health'
import authRouter from './routes/auth'
import sessionsRouter from './routes/sessions'
import operatorsRouter from './routes/operators'
import gamesRouter from './routes/games'
import adminGamesRouter from './routes/admin/games'
import tokensRouter from './routes/tokens'
import adminTokensRouter from './routes/admin/tokens'
import webhooksRouter from './routes/webhooks'

const app = express()
const PORT = parseInt(process.env.PORT || '3002', 10)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({
  origin: FRONTEND_URL.split(',').map(u => u.trim()),
  credentials: true,
}))

// Webhook route needs raw body for Stripe signature verification — mount before json parser
app.use(webhooksRouter)

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Routes
app.use(healthRouter)
app.use(authRouter)
app.use(sessionsRouter)
app.use(operatorsRouter)
app.use(gamesRouter)
app.use(adminGamesRouter)
app.use(tokensRouter)
app.use(adminTokensRouter)

// Error handler (must be last)
app.use(errorHandler)

// Only listen when running directly (not as Vercel serverless function)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Backend running on http://localhost:${PORT}`)
  })
}

export default app
