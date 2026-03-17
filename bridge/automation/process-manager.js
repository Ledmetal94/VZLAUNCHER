import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/** Tracks spawned game processes and handles cleanup */
export function createProcessManager(logger) {
  /** @type {Map<string, { pid: number, process: import('child_process').ChildProcess, startedAt: number, platform: string, gameId: string }>} */
  const tracked = new Map()
  const crashHandlers = []

  return {
    /** Register a spawned process */
    register(gameId, proc, platform) {
      const entry = {
        pid: proc.pid,
        process: proc,
        startedAt: Date.now(),
        platform,
        gameId,
      }
      tracked.set(gameId, entry)
      logger.info({ gameId, pid: proc.pid, platform }, 'Process registered')

      proc.on('exit', (code, signal) => {
        logger.info({ gameId, pid: proc.pid, code, signal }, 'Process exited')
        tracked.delete(gameId)
        // Notify crash handlers if unexpected exit
        if (code !== 0 && code !== null) {
          for (const handler of crashHandlers) {
            handler(gameId, code, signal)
          }
        }
      })

      proc.on('error', (err) => {
        logger.error({ gameId, pid: proc.pid, err: err.message }, 'Process error')
        tracked.delete(gameId)
        for (const handler of crashHandlers) {
          handler(gameId, -1, err.message)
        }
      })
    },

    /** Kill a specific game process (Windows: taskkill /F /T /PID) */
    async kill(gameId) {
      const entry = tracked.get(gameId)
      if (!entry) {
        logger.warn({ gameId }, 'No tracked process to kill')
        return false
      }

      const pid = Number(entry.pid)
      if (!Number.isInteger(pid) || pid <= 0) {
        logger.error({ gameId, pid: entry.pid }, 'Invalid PID — skipping kill')
        tracked.delete(gameId)
        return false
      }

      try {
        await execAsync(`taskkill /F /T /PID ${pid}`)
        logger.info({ gameId, pid: entry.pid }, 'Process killed')
      } catch (err) {
        // Process may have already exited
        logger.warn({ gameId, pid: entry.pid, err: err.message }, 'taskkill failed (process may have exited)')
      }

      tracked.delete(gameId)
      return true
    },

    /** Kill all tracked processes */
    async killAll() {
      const ids = [...tracked.keys()]
      for (const gameId of ids) {
        await this.kill(gameId)
      }
    },

    /** Register a crash handler */
    onCrash(handler) {
      crashHandlers.push(handler)
    },

    /** Check if a game process is running */
    isRunning(gameId) {
      return tracked.has(gameId)
    },

    /** Get info about tracked process */
    getInfo(gameId) {
      const entry = tracked.get(gameId)
      if (!entry) return null
      return { pid: entry.pid, startedAt: entry.startedAt, platform: entry.platform }
    },

    /** Get all tracked processes */
    getAll() {
      const result = {}
      for (const [gameId, entry] of tracked) {
        result[gameId] = { pid: entry.pid, startedAt: entry.startedAt, platform: entry.platform }
      }
      return result
    },
  }
}
