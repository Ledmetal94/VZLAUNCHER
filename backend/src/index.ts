import express from 'express'
import cors from 'cors'
import { logger } from './lib/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import healthRouter from './routes/health.js'

const app = express()
const PORT = parseInt(process.env.PORT || '3002', 10)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))

// Routes
app.use(healthRouter)

// Error handler (must be last)
app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`Backend running on http://localhost:${PORT}`)
})

export default app
