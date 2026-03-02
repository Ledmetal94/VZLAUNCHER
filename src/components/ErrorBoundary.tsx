import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { reportError } from '@/services/errorInbox'

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-[#F5F5F5]">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <pre className="text-sm text-[#888888] mb-4">{msg}</pre>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-[#E5007E] text-white rounded-xl"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

function handleError(error: unknown, info: { componentStack?: string | null }) {
  const err = error instanceof Error ? error : new Error(String(error))
  reportError(
    err.message,
    err.toString(),
    err.stack ?? '',
    'ERROR',
    { componentStack: info.componentStack ?? '' },
  )
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary FallbackComponent={Fallback} onError={handleError}>
      {children}
    </ReactErrorBoundary>
  )
}
