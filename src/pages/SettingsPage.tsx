import { useState, type FormEvent } from 'react'
import { useStore } from '../context/StoreContext'
import { useToast } from '../components/Toast'
import { backendMode } from '../lib/api'
import { demoApi } from '../lib/demoStore'

export function SettingsPage() {
  const { store, locations, trash, createLocation, restoreProduct, createStore, stores } =
    useStore()
  const toast = useToast()
  const [locName, setLocName] = useState('')
  const [locCode, setLocCode] = useState('')
  const [newStore, setNewStore] = useState('')

  async function addLocation(e: FormEvent) {
    e.preventDefault()
    await createLocation(locName, locCode)
    setLocName('')
    setLocCode('')
    toast('Sede agregada')
  }

  async function addStore(e: FormEvent) {
    e.preventDefault()
    await createStore(newStore)
    setNewStore('')
    toast('Tienda creada')
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-sub">Sedes, tiendas y papelera · modo {backendMode}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel panel-pad">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Sedes</h3>
          <ul>
            {locations.map((l) => (
              <li key={l.id}>
                <strong>{l.name}</strong> <span className="badge">{l.code}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={addLocation}>
            <div className="field">
              <label>Nombre</label>
              <input value={locName} onChange={(e) => setLocName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Código</label>
              <input
                value={locCode}
                onChange={(e) => setLocCode(e.target.value)}
                placeholder="CDB"
                required
              />
            </div>
            <button className="btn btn-primary">Agregar sede</button>
          </form>
        </div>

        <div className="panel panel-pad">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Tus tiendas</h3>
          <ul>
            {stores.map((s) => (
              <li key={s.id}>
                {s.name} {s.id === store?.id ? <span className="badge">activa</span> : null}
              </li>
            ))}
          </ul>
          <form onSubmit={addStore}>
            <div className="field">
              <label>Nueva tienda</label>
              <input value={newStore} onChange={(e) => setNewStore(e.target.value)} required />
            </div>
            <button className="btn btn-primary">Crear otra tienda</button>
          </form>

          {backendMode === 'demo' ? (
            <button
              className="btn btn-danger"
              style={{ marginTop: 16 }}
              onClick={() => {
                demoApi.reset()
                window.location.reload()
              }}
            >
              Reset demo local
            </button>
          ) : null}
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Papelera</h3>
        {!trash.length ? (
          <div className="empty">No hay productos eliminados.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trash.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          void restoreProduct(p.id).then(() => toast('Producto restaurado'))
                        }
                      >
                        Restaurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
