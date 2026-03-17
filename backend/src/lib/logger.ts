import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL

export const logger = pino(
  isDev
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : { level: process.env.LOG_LEVEL || 'info' },
)
