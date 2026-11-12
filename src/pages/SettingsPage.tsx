import { useState, type FormEvent } from 'react'
import {
  Building2,
  MapPin,
  Plus,
  RotateCcw,
  Store,
  Trash2,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useToast } from '../components/Toast'
import { backendMode } from '../lib/api'
import { demoApi } from '../lib/demoStore'
import { slugify } from '../lib/id'

export function SettingsPage() {
  const {
    store,
    locations,
    trash,
    createLocation,
    restoreProduct,
    createStore,
    stores,
    setStoreId,
  } = useStore()
  const toast = useToast()
  const [locName, setLocName] = useState('')
  const [locCode, setLocCode] = useState('')
  const [newStore, setNewStore] = useState('')

  async function addLocation(e: FormEvent) {
    e.preventDefault()
    const code =
      locCode.trim() ||
      slugify(locName).slice(0, 8).toUpperCase().replace(/-/g, '') ||
      'SEDE'
    await createLocation(locName, code)
    setLocName('')
    setLocCode('')
    toast('Sede agregada')
  }

  async function addStore(e: FormEvent) {
    e.preventDefault()
    const created = await createStore(newStore)
    setStoreId(created.id)
    setNewStore('')
    toast('Negocio creado')
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-sub">
            Sedes y negocios · {backendMode === 'supabase' ? 'Supabase' : 'Demo local'}
          </p>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel panel-pad">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <MapPin size={18} />
            Sedes
          </h3>
          <p className="page-sub" style={{ marginBottom: 12 }}>
            Empiezas con una. Agrega más solo si vendes en varios lugares.
          </p>
          <ul style={{ paddingLeft: 18, marginTop: 0 }}>
            {locations.map((l) => (
              <li key={l.id} style={{ marginBottom: 6 }}>
                <strong>{l.name}</strong>{' '}
                <span className="badge badge-muted">{l.code}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={addLocation}>
            <div className="field">
              <label>Nombre de la sede</label>
              <input
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                placeholder="Ej. Sucursal Centro"
                required
              />
            </div>
            <div className="field">
              <label>Código (opcional)</label>
              <input
                value={locCode}
                onChange={(e) => setLocCode(e.target.value)}
                placeholder="Se genera solo si lo dejas vacío"
              />
            </div>
            <button className="btn btn-primary">
              <Plus size={16} />
              Agregar sede
            </button>
          </form>
        </div>

        <div className="panel panel-pad">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Store size={18} />
            Negocios
          </h3>
          <ul style={{ paddingLeft: 18, marginTop: 0 }}>
            {stores.map((s) => (
              <li key={s.id} style={{ marginBottom: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStoreId(s.id)}
                  style={{ marginRight: 6 }}
                >
                  <Building2 size={14} />
                  {s.name}
                </button>
                {s.id === store?.id ? <span className="badge">activo</span> : null}
              </li>
            ))}
          </ul>
          <form onSubmit={addStore}>
            <div className="field">
              <label>Nuevo negocio</label>
              <input
                value={newStore}
                onChange={(e) => setNewStore(e.target.value)}
                placeholder="Ej. Tocks Cafe"
                required
              />
            </div>
            <button className="btn btn-primary">
              <Plus size={16} />
              Crear negocio
            </button>
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
              <RotateCcw size={16} />
              Reset demo local
            </button>
          ) : null}
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Trash2 size={18} />
          Papelera
        </h3>
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
                        <RotateCcw size={14} />
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
