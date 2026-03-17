import { spawn } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PYTHON_DIR = resolve(__dirname, '..', 'python')

/**
 * Resolves the Python executable path.
 * Prefers venv, falls back to system Python.
 */
function resolvePythonPath() {
  const venvPython = resolve(PYTHON_DIR, '.venv', 'Scripts', 'python.exe')
  if (existsSync(venvPython)) return venvPython

  // Fallback: try system python
  return 'python'
}

/**
 * Check Python availability at startup.
 * Returns { available: boolean, path: string, error?: string }
 */
export async function checkPythonHealth(logger) {
  const pythonPath = resolvePythonPath()
  return new Promise((resolve) => {
    const proc = spawn(pythonPath, ['-c', 'import pyautogui, cv2, pygetwindow; print("ok")'], {
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d })
    proc.stderr.on('data', (d) => { stderr += d })

    proc.on('close', (code) => {
      if (code === 0 && stdout.trim() === 'ok') {
        logger.info({ pythonPath }, 'Python health check passed')
        resolve({ available: true, path: pythonPath })
      } else {
        logger.warn({ pythonPath, code, stderr: stderr.trim() }, 'Python health check failed')
        resolve({ available: false, path: pythonPath, error: stderr.trim() || `exit code ${code}` })
      }
    })

    proc.on('error', (err) => {
      logger.warn({ pythonPath, err: err.message }, 'Python not found')
      resolve({ available: false, path: pythonPath, error: err.message })
    })
  })
}

/**
 * Creates a persistent Python runner for a single automation sequence.
 *
 * The Python process stays alive reading JSON lines from stdin.
 * Each step is sent as a JSON line, result read from stdout.
 * Process killed after sequence completes or on abort.
 */
export function createPythonRunner(pythonPath, logger) {
  let proc = null
  let pendingResolve = null
  let pendingReject = null
  let pendingTimeout = null
  let stdoutBuffer = ''

  function start() {
    const runnerScript = resolve(PYTHON_DIR, 'runner.py')
    proc = spawn(pythonPath, [runnerScript], {
      cwd: PYTHON_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    proc.stdout.on('data', (data) => {
      stdoutBuffer += data.toString()
      // Process complete lines
      const lines = stdoutBuffer.split('\n')
      stdoutBuffer = lines.pop() // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const result = JSON.parse(line)
          if (pendingResolve) {
            clearTimeout(pendingTimeout)
            const res = pendingResolve
            pendingResolve = null
            pendingReject = null
            pendingTimeout = null
            res(result)
          }
        } catch (err) {
          logger.warn({ line }, 'Failed to parse Python output')
        }
      }
    })

    proc.stderr.on('data', (data) => {
      logger.warn({ stderr: data.toString().trim() }, 'Python stderr')
    })

    proc.on('close', (code) => {
      if (pendingReject) {
        clearTimeout(pendingTimeout)
        pendingReject(new Error(`Python process exited with code ${code}`))
        pendingResolve = null
        pendingReject = null
        pendingTimeout = null
      }
      proc = null
    })

    proc.on('error', (err) => {
      if (pendingReject) {
        clearTimeout(pendingTimeout)
        pendingReject(err)
        pendingResolve = null
        pendingReject = null
        pendingTimeout = null
      }
      proc = null
    })

    logger.debug('Python runner started')
  }

  function execute(step, signal) {
    if (!proc || !proc.stdin.writable) {
      return Promise.reject(new Error('Python runner not started'))
    }

    const timeout = step.timeout || 10000
    const retries = step.retries || 0

    return attemptExecute(step, signal, timeout, retries, 0)
  }

  function attemptExecute(step, signal, timeout, maxRetries, attempt) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error('Aborted'))
      }

      // Abort listener
      const onAbort = () => {
        clearTimeout(pendingTimeout)
        if (pendingReject) {
          pendingReject(new Error('Aborted'))
          pendingResolve = null
          pendingReject = null
          pendingTimeout = null
        }
      }
      signal?.addEventListener('abort', onAbort, { once: true })

      pendingResolve = (result) => {
        signal?.removeEventListener('abort', onAbort)
        if (!result.success && attempt < maxRetries) {
          // Retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
          logger.info({ attempt: attempt + 1, maxRetries, delay }, 'Retrying Python action')
          setTimeout(() => {
            attemptExecute(step, signal, timeout, maxRetries, attempt + 1)
              .then(resolve)
              .catch(reject)
          }, delay)
        } else {
          resolve(result)
        }
      }

      pendingReject = (err) => {
        signal?.removeEventListener('abort', onAbort)
        reject(err)
      }

      pendingTimeout = setTimeout(() => {
        if (pendingReject) {
          const rej = pendingReject
          pendingResolve = null
          pendingReject = null
          pendingTimeout = null
          signal?.removeEventListener('abort', onAbort)
          rej(new Error(`Python action timed out after ${timeout}ms`))
        }
      }, timeout)

      // Send step as JSON line
      try {
        proc.stdin.write(JSON.stringify(step) + '\n')
      } catch (err) {
        clearTimeout(pendingTimeout)
        signal?.removeEventListener('abort', onAbort)
        pendingResolve = null
        pendingReject = null
        pendingTimeout = null
        reject(new Error(`Failed to write to Python stdin: ${err.message}`))
      }
    })
  }

  function stop() {
    if (!proc) return Promise.resolve()

    return new Promise((resolve) => {
      const killTimer = setTimeout(() => {
        if (proc) {
          proc.kill('SIGKILL')
        }
        resolve()
      }, 3000)

      proc.on('close', () => {
        clearTimeout(killTimer)
        resolve()
      })

      // Send exit command
      try {
        proc.stdin.write(JSON.stringify({ type: 'exit' }) + '\n')
        proc.stdin.end()
      } catch {
        if (proc) proc.kill()
        clearTimeout(killTimer)
        resolve()
      }
    })
  }

  return { start, execute, stop }
}
