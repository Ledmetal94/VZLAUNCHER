import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-screen w-screen items-center justify-center"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="flex flex-col items-center gap-6" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255,68,68,0.1)',
                border: '1px solid rgba(255,68,68,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              !
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                Qualcosa è andato storto
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                Si è verificato un errore imprevisto. Riprova o ricarica la pagina.
              </p>
            </div>
            {this.state.error && (
              <pre
                style={{
                  fontSize: 10,
                  color: '#ff4444',
                  background: 'rgba(255,68,68,0.06)',
                  border: '1px solid rgba(255,68,68,0.15)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  maxWidth: '100%',
                  overflow: 'auto',
                  textAlign: 'left',
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  background: '#E6007E',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Riprova
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: '1px solid rgba(123,100,169,0.18)',
                  background: 'rgba(255,255,255,0.025)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Ricarica
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
