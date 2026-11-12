import { useEffect, useState, type FormEvent } from 'react'
import {
  Building2,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Store,
  Trash2,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useToast } from '../components/Toast'
import { ConfirmTypeModal } from '../components/ConfirmTypeModal'
import { backendMode } from '../lib/api'
import { demoApi } from '../lib/demoStore'
import { slugify } from '../lib/id'

export function SettingsPage() {
  const {
    store,
    locations,
    trash,
    createLocation,
    renameLocation,
    softDeleteLocation,
    renameStore,
    softDeleteStore,
    restoreProduct,
    createStore,
    stores,
    setStoreId,
  } = useStore()
  const toast = useToast()
  const [locName, setLocName] = useState('')
  const [locCode, setLocCode] = useState('')
  const [newStore, setNewStore] = useState('')
  const [storeName, setStoreName] = useState(store?.name || '')
  const [editingLocId, setEditingLocId] = useState<string | null>(null)
  const [editLocName, setEditLocName] = useState('')
  const [editLocCode, setEditLocCode] = useState('')
  const [deleteLocId, setDeleteLocId] = useState<string | null>(null)
  const [deleteStoreOpen, setDeleteStoreOpen] = useState(false)

  useEffect(() => {
    setStoreName(store?.name || '')
  }, [store?.id, store?.name])

  const deletingLoc = locations.find((l) => l.id === deleteLocId) || null

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

  async function saveStoreName(e: FormEvent) {
    e.preventDefault()
    await renameStore(storeName)
    toast('Negocio renombrado')
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Sedes y negocio</h1>
          <p className="page-sub">
            {store?.name} · {backendMode === 'supabase' ? 'Supabase' : 'Demo local'}
          </p>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel panel-pad">
          <h3
            style={{
              marginTop: 0,
              fontFamily: 'var(--display)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <MapPin size={18} />
            Sedes
          </h3>
          <p className="page-sub" style={{ marginBottom: 12 }}>
            Empiezas con una. Agrega más solo si vendes en varios lugares.
          </p>
          <ul style={{ paddingLeft: 0, listStyle: 'none', marginTop: 0 }}>
            {locations.map((l) => (
              <li
                key={l.id}
                style={{
                  marginBottom: 10,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                {editingLocId === l.id ? (
                  <form
                    style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}
                    onSubmit={(e) => {
                      e.preventDefault()
                      void renameLocation(l.id, editLocName, editLocCode).then(() => {
                        setEditingLocId(null)
                        toast('Sede actualizada')
                      })
                    }}
                  >
                    <input
                      value={editLocName}
                      onChange={(e) => setEditLocName(e.target.value)}
                      required
                      style={{ flex: 1, minWidth: 120 }}
                    />
                    <input
                      value={editLocCode}
                      onChange={(e) => setEditLocCode(e.target.value)}
                      style={{ width: 90 }}
                    />
                    <button className="btn btn-primary btn-sm" type="submit">
                      Guardar
                    </button>
                  </form>
                ) : (
                  <>
                    <strong>{l.name}</strong>
                    <span className="badge badge-muted">{l.code}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingLocId(l.id)
                        setEditLocName(l.name)
                        setEditLocCode(l.code)
                      }}
                    >
                      <Pencil size={14} />
                      Renombrar
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteLocId(l.id)}
                      disabled={locations.length <= 1}
                      title={
                        locations.length <= 1
                          ? 'Debe quedar al menos una sede'
                          : 'Eliminar sede'
                      }
                    >
                      <Trash2 size={14} />
                      Borrar
                    </button>
                  </>
                )}
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
          <h3
            style={{
              marginTop: 0,
              fontFamily: 'var(--display)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <Store size={18} />
            Negocio activo
          </h3>
          <form onSubmit={saveStoreName}>
            <div className="field">
              <label>Nombre del negocio</label>
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
              />
            </div>
            <div className="toolbar">
              <button className="btn btn-primary" type="submit">
                <Pencil size={16} />
                Guardar nombre
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => setDeleteStoreOpen(true)}
              >
                <Trash2 size={16} />
                Borrar negocio
              </button>
            </div>
          </form>

          <h4 style={{ marginTop: 24 }}>Todos tus negocios</h4>
          <ul style={{ paddingLeft: 18, marginTop: 0 }}>
            {stores.map((s) => (
              <li key={s.id} style={{ marginBottom: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setStoreId(s.id)
                    setStoreName(s.name)
                  }}
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
              type="button"
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
        <h3
          style={{
            marginTop: 0,
            fontFamily: 'var(--display)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <Trash2 size={18} />
          Papelera de productos
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
                        type="button"
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

      <ConfirmTypeModal
        open={Boolean(deletingLoc)}
        title="Eliminar sede"
        dangerText={`Vas a eliminar la sede “${deletingLoc?.name || ''}”. El stock de esa sede dejará de usarse en la caja.`}
        confirmLabel="Eliminar sede"
        onClose={() => setDeleteLocId(null)}
        onConfirm={async () => {
          if (!deletingLoc) return
          await softDeleteLocation(deletingLoc.id)
          toast('Sede eliminada')
        }}
      />

      <ConfirmTypeModal
        open={deleteStoreOpen}
        title="Eliminar negocio"
        dangerText={`Vas a eliminar el negocio “${store?.name || ''}”. Productos, ventas y caja dejarán de estar accesibles.`}
        confirmLabel="Eliminar negocio"
        onClose={() => setDeleteStoreOpen(false)}
        onConfirm={async () => {
          await softDeleteStore()
          toast('Negocio eliminado')
        }}
      />
    </div>
  )
}
