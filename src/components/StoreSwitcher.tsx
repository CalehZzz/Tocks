import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useToast } from './Toast'

export function StoreSwitcher() {
  const { stores, store, setStoreId, createStore } = useStore()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const created = await createStore(name.trim())
      setStoreId(created.id)
      setName('')
      setCreating(false)
      setOpen(false)
      toast('Negocio creado')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo crear')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="store-switcher" ref={ref}>
      <button
        type="button"
        className="store-switcher-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Building2 size={18} strokeWidth={2} />
        <span className="store-switcher-name">{store?.name || 'Tu negocio'}</span>
        <ChevronsUpDown size={16} strokeWidth={2} className="store-switcher-chevron" />
      </button>

      {open ? (
        <div className="store-switcher-menu">
          <div className="store-switcher-label">Tus negocios</div>
          {stores.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`store-switcher-item${s.id === store?.id ? ' active' : ''}`}
              onClick={() => {
                setStoreId(s.id)
                setOpen(false)
                setCreating(false)
              }}
            >
              <Building2 size={16} />
              <span>{s.name}</span>
              {s.id === store?.id ? <Check size={16} /> : null}
            </button>
          ))}

          {creating ? (
            <form className="store-switcher-form" onSubmit={onCreate}>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del negocio"
                required
              />
              <button className="btn btn-primary btn-sm" disabled={busy} type="submit">
                {busy ? 'Creando…' : 'Crear'}
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="store-switcher-item create"
              onClick={() => setCreating(true)}
            >
              <Plus size={16} />
              <span>Crear nuevo negocio</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
