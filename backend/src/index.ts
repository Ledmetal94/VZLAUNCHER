import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { logger } from './lib/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import sessionsRouter from './routes/sessions.js'
import operatorsRouter from './routes/operators.js'
import gamesRouter from './routes/games.js'
import adminGamesRouter from './routes/admin/games.js'

const app = express()
const PORT = parseInt(process.env.PORT || '3002', 10)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Routes
app.use(healthRouter)
app.use(authRouter)
app.use(sessionsRouter)
app.use(operatorsRouter)
app.use(gamesRouter)
app.use(adminGamesRouter)

// Error handler (must be last)
app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`Backend running on http://localhost:${PORT}`)
})

export default app
