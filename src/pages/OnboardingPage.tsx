import { useState, type FormEvent } from 'react'
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
      toast('Tienda creada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la tienda')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hero">
          <div className="brand-mark">Tk</div>
          <h1>Crea tu tienda</h1>
          <p>
            Sin suscripción en esta demo: añade tu negocio y empieza a gestionar
            inventario y caja.
          </p>
        </div>
        <div className="auth-body">
          {error ? <div className="error-box">{error}</div> : null}
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Nombre de la tienda</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Electro Norte"
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Creando…' : 'Crear tienda'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
