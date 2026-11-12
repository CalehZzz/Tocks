import { useState, type FormEvent } from 'react'
import { Store } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useToast } from '../components/Toast'

export function OnboardingPage() {
  const { createStore } = useStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await createStore(name)
      toast('Negocio listo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hero">
          <div className="brand-mark">
            <Store size={22} />
          </div>
          <h1>Tu primer negocio</h1>
          <p>Empieza con una sede. Luego puedes agregar más si las necesitas.</p>
        </div>
        <div className="auth-body">
          {error ? <div className="error-box">{error}</div> : null}
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Nombre del negocio</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Electro Norte"
                required
              />
              <div className="field-hint">Se creará con 1 sede: “Sede principal”.</div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Creando…' : 'Crear negocio'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
