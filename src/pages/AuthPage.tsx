import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export function AuthPage() {
  const { signIn, signUp, backendMode } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await signIn(email, password)
      else await signUp(email, password, name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo autenticar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hero">
          <div className="brand-mark">Tk</div>
          <h1>Tocks</h1>
          <p>
            Inventario, caja y ventas para tu tienda. Demo multi-tenant lista
            para conectar a Supabase.
          </p>
        </div>
        <div className="auth-body">
          <div className="mode-pill" style={{ marginBottom: 14, color: 'var(--ink)' }}>
            <span className={`mode-dot ${backendMode === 'supabase' ? 'live' : ''}`} />
            {backendMode === 'supabase' ? 'Supabase conectado' : 'Modo demo local'}
          </div>
          {error ? <div className="error-box">{error}</div> : null}
          <form onSubmit={onSubmit}>
            {mode === 'signup' ? (
              <div className="field">
                <label>Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </div>
            ) : null}
            <div className="field">
              <label>Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy
                ? 'Espera…'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Crear cuenta y empezar'}
            </button>
          </form>
          <div className="auth-switch">
            {mode === 'login' ? (
              <>
                ¿Nuevo en Tocks?{' '}
                <button type="button" onClick={() => setMode('signup')}>
                  Crear cuenta
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button type="button" onClick={() => setMode('login')}>
                  Iniciar sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
