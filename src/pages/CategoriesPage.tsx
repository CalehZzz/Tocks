import { useState, type FormEvent } from 'react'
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useToast } from '../components/Toast'
import { ConfirmTypeModal } from '../components/ConfirmTypeModal'

export function CategoriesPage() {
  const { store, categories, createCategory, renameCategory, deleteCategory } = useStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const deleting = categories.find((c) => c.id === deleteId) || null

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await createCategory(name)
      setName('')
      toast('Categoría creada')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-sub">Organiza productos de {store?.name}</p>
        </div>
      </div>

      <div className="grid-2">
        <form className="panel panel-pad" onSubmit={onCreate}>
          <h3 style={{ marginTop: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8 }}>
            <Plus size={18} /> Nueva categoría
          </h3>
          <div className="field">
            <label>Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Resistencias"
              required
            />
          </div>
          <button className="btn btn-primary" disabled={busy}>
            Crear categoría
          </button>
        </form>

        <div className="panel panel-pad">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8 }}>
            <FolderTree size={18} /> Lista
          </h3>
          {!categories.length ? (
            <div className="empty">Todavía no hay categorías.</div>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {editingId === c.id ? (
                          <form
                            style={{ display: 'flex', gap: 8 }}
                            onSubmit={(e) => {
                              e.preventDefault()
                              void renameCategory(c.id, editName).then(() => {
                                setEditingId(null)
                                toast('Categoría actualizada')
                              })
                            }}
                          >
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              required
                            />
                            <button className="btn btn-primary btn-sm" type="submit">
                              Guardar
                            </button>
                          </form>
                        ) : (
                          c.name
                        )}
                      </td>
                      <td>
                        <div className="toolbar">
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() => {
                              setEditingId(c.id)
                              setEditName(c.name)
                            }}
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            onClick={() => setDeleteId(c.id)}
                          >
                            <Trash2 size={14} />
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmTypeModal
        open={Boolean(deleting)}
        title="Eliminar categoría"
        dangerText={`Vas a eliminar la categoría “${deleting?.name || ''}”. Los productos quedarán sin categoría.`}
        confirmLabel="Eliminar categoría"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleting) return
          await deleteCategory(deleting.id)
          toast('Categoría eliminada')
        }}
      />
    </div>
  )
}
