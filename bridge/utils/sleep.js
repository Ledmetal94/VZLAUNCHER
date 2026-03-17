/**
 * Promisified delay with optional AbortSignal
 */
export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer)
        reject(new Error('Sleep aborted'))
        return
      }
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new Error('Sleep aborted'))
      }, { once: true })
    }
  })
}
