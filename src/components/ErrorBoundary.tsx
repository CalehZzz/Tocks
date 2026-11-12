import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tocks crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-hero">
            <div className="brand-mark">Tk</div>
            <h1>Algo falló</h1>
            <p>La app crasheó al cargar. Recarga o revisa la consola.</p>
          </div>
          <div className="auth-body">
            <div className="error-box">{this.state.error.message}</div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => window.location.assign('/')}
            >
              Recargar Tocks
            </button>
          </div>
        </div>
      </div>
    )
  }
}
