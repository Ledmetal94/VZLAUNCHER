const ERROR_INBOX_URL = 'https://api.ag-llama.com/api/external/errors'
const ERROR_INBOX_KEY = import.meta.env.VITE_LLAMA_ERROR_KEY as string

export async function reportError(
  title: string,
  message?: string,
  stack?: string,
  category: 'ERROR' | 'USER_INPUT' = 'ERROR',
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!ERROR_INBOX_KEY) return

  fetch(ERROR_INBOX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ERROR_INBOX_KEY,
      'x-api-key-name': 'VZLAUNCHER Web App',
    },
    body: JSON.stringify({
      title,
      message,
      stackTrace: stack ?? '',
      category,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...metadata,
      },
    }),
  }).catch(() => {}) // fire-and-forget
}
