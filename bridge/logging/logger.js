import pino from 'pino'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Ensure logs directory exists
const logsDir = resolve(__dirname, 'logs')
try { mkdirSync(logsDir, { recursive: true }) } catch {}

const isDev = process.env.NODE_ENV !== 'production'

const transport = isDev
  ? pino.transport({
      targets: [
        {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
        {
          target: 'pino/file',
          options: { destination: resolve(logsDir, 'bridge.log'), mkdir: true },
        },
      ],
    })
  : pino.transport({
      target: 'pino/file',
      options: { destination: resolve(logsDir, 'bridge.log'), mkdir: true },
    })

export const logger = pino({ level: 'info' }, transport)

/** Create a child logger scoped to a session */
export function sessionLogger(sessionId, gameId) {
  return logger.child({ sessionId, gameId })
}
