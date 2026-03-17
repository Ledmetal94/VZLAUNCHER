import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { logger } from './lib/logger'
import { errorHandler } from './middleware/errorHandler'
import { requestId } from './middleware/requestId'
import { venueRateLimit } from './middleware/rateLimit'
import healthRouter from './routes/health'
import authRouter from './routes/auth'
import sessionsRouter from './routes/sessions'
import operatorsRouter from './routes/operators'
import gamesRouter from './routes/games'
import adminGamesRouter from './routes/admin/games'
import tokensRouter from './routes/tokens'
import adminTokensRouter from './routes/admin/tokens'
import adminAnalyticsRouter from './routes/admin/analytics'
import webhooksRouter from './routes/webhooks'
import superAdminAuthRouter from './routes/superAdmin/auth'
import superAdminVenuesRouter from './routes/superAdmin/venues'
import superAdminAnalyticsRouter from './routes/superAdmin/analytics'
import superAdminOperatorsRouter from './routes/superAdmin/operators'
import licenseRouter from './routes/license'
import bankTransferRouter from './routes/bankTransfer'

const app = express()
const PORT = parseInt(process.env.PORT || '3002', 10)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(requestId)
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

// Global venue-level rate limit: 100 req/min/venue (applied after auth routes which have their own limits)
app.use('/api/v1', venueRateLimit(100, 60 * 1000))

app.use(sessionsRouter)
app.use(operatorsRouter)
app.use(gamesRouter)
app.use(adminGamesRouter)
app.use(tokensRouter)
app.use(adminTokensRouter)
app.use(adminAnalyticsRouter)
app.use(superAdminAuthRouter)
app.use(superAdminVenuesRouter)
app.use(superAdminAnalyticsRouter)
app.use(superAdminOperatorsRouter)
app.use(licenseRouter)
app.use(bankTransferRouter)

// Error handler (must be last)
app.use(errorHandler)

// Only listen when running directly (not as Vercel serverless function)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Backend running on http://localhost:${PORT}`)
  })
}

export default app
