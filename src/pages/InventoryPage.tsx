import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign,
  ImagePlus,
  Package,
  PackagePlus,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/money'
import { useToast } from '../components/Toast'
import { ConfirmTypeModal } from '../components/ConfirmTypeModal'
import type { Product } from '../types'

type FormState = {
  name: string
  description: string
  cost: string
  price: string
  discount: string
  categoryId: string
  imageUrl: string | null
  stockMap: Record<string, string>
}

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  cost: '',
  price: '',
  discount: '0',
  categoryId: '',
  imageUrl: null,
  stockMap: {},
})

export function InventoryPage() {
  const {
    store,
    products,
    locations,
    categories,
    createProduct,
    softDeleteProduct,
    updateProduct,
    uploadProductImage,
  } = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const deleting = products.find((p) => p.id === deleteId) || null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    )
  }, [products, query])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(p: Product) {
    const stockMap: Record<string, string> = {}
    for (const loc of locations) {
      stockMap[loc.id] = String(p.stock?.[loc.id] ?? 0)
    }
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description || '',
      cost: String(p.cost),
      price: String(p.price),
      discount: String(p.discount_pct || 0),
      categoryId: p.category_id || '',
      imageUrl: p.image_url,
      stockMap,
    })
    setShowForm(true)
  }

  async function onImage(file: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadProductImage(file)
      setForm((f) => ({ ...f, imageUrl: url }))
      toast('Imagen comprimida y lista')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo subir')
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const stockByLocation: Record<string, number> = {}
      for (const loc of locations) {
        stockByLocation[loc.id] = Number(form.stockMap[loc.id] || 0)
      }
      const payload = {
        name: form.name,
        description: form.description,
        cost: Number(form.cost),
        price: Number(form.price),
        discount_pct: Number(form.discount) || 0,
        category_id: form.categoryId || null,
        image_url: form.imageUrl,
        stockByLocation,
      }
      if (editingId) {
        await updateProduct(editingId, payload)
        toast('Producto actualizado')
      } else {
        await createProduct(payload)
        toast('Producto guardado')
      }
      setForm(emptyForm())
      setEditingId(null)
      setShowForm(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  async function quickRestock(productId: string, locationId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const current = product.stock?.[locationId] || 0
    const raw = window.prompt('Cantidad a sumar', '1')
    if (raw == null) return
    const add = Number(raw)
    if (!Number.isFinite(add) || add <= 0) return
    await updateProduct(productId, {
      stockByLocation: { ...product.stock, [locationId]: current + add },
    })
    toast('Stock actualizado')
  }

  function catName(id: string | null) {
    if (!id) return null
    return categories.find((c) => c.id === id)?.name || null
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-sub">Productos y stock de {store?.name}</p>
        </div>
        <div className="toolbar">
          <label className="search-input">
            <Search size={16} color="var(--muted)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto…"
            />
          </label>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => (showForm ? (setShowForm(false), setEditingId(null)) : openCreate())}
          >
            <PackagePlus size={16} />
            {showForm ? 'Cerrar' : 'Nuevo producto'}
          </button>
        </div>
      </div>

      {showForm ? (
        <form className="panel panel-pad" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, fontFamily: 'var(--display)' }}>
            {editingId ? 'Editar producto' : 'Nuevo producto'}
          </h3>
          <div className="grid-2">
            <div>
              <div className="field">
                <label>Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Resistencia 10k"
                  required
                />
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Opcional: detalles del producto"
                />
              </div>
              <div className="field">
                <label>Categoría</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="field-hint">
                  ¿Necesitas otra?{' '}
                  <Link to="/categories">Crear categorías aquí</Link>
                </div>
              </div>
              <div className="field">
                <label>Imagen</label>
                <div className="toolbar">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="thumb" />
                  ) : null}
                  <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    <ImagePlus size={14} />
                    {uploading ? 'Subiendo…' : 'Subir imagen'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={uploading}
                      onChange={(e) => void onImage(e.target.files?.[0] || null)}
                    />
                  </label>
                  {form.imageUrl ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setForm((f) => ({ ...f, imageUrl: null }))}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
                <div className="field-hint">
                  Se comprime sola (~1200px JPEG) y se guarda en Storage, no en la base de
                  datos.
                </div>
              </div>
            </div>
            <div>
              <div className="field">
                <label>Costo</label>
                <div className="money-input">
                  <DollarSign size={18} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                    placeholder="0.50"
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label>Precio de venta</label>
                <div className="money-input">
                  <DollarSign size={18} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="1.25"
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label>Descuento tienda %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.discount}
                  onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                  placeholder="0"
                />
              </div>
              {locations.map((loc) => (
                <div className="field" key={loc.id}>
                  <label>Stock · {loc.name}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stockMap[loc.id] || ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stockMap: { ...f.stockMap, [loc.id]: e.target.value },
                      }))
                    }
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy || uploading}>
            <Package size={16} />
            {busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar producto'}
          </button>
        </form>
      ) : null}

      <div className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Costo</th>
                {locations.map((l) => (
                  <th key={l.id}>{l.code}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="thumb" />
                      ) : null}
                      <div>
                        <strong>{p.name}</strong>
                        {p.discount_pct > 0 ? (
                          <span className="badge" style={{ marginLeft: 8 }}>
                            -{p.discount_pct}%
                          </span>
                        ) : null}
                        {catName(p.category_id) ? (
                          <span className="badge badge-muted" style={{ marginLeft: 8 }}>
                            {catName(p.category_id)}
                          </span>
                        ) : null}
                        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                          {p.description || 'Sin descripción'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{money(p.price, store?.currency)}</td>
                  <td>{money(p.cost, store?.currency)}</td>
                  {locations.map((l) => (
                    <td key={l.id}>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => void quickRestock(p.id, l.id)}
                        title="Sumar stock"
                      >
                        {p.stock?.[l.id] ?? 0}
                      </button>
                    </td>
                  ))}
                  <td>
                    <div className="toolbar">
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        type="button"
                        onClick={() => setDeleteId(p.id)}
                      >
                        <Trash2 size={14} />
                        Quitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={4 + locations.length}>
                    <div className="empty">
                      <div className="empty-icon">
                        <Package size={22} />
                      </div>
                      Aún no hay productos. Crea el primero.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmTypeModal
        open={Boolean(deleting)}
        title="Eliminar producto"
        dangerText={`Vas a mover “${deleting?.name || ''}” a la papelera. Ya no aparecerá en inventario ni en la caja.`}
        confirmLabel="Eliminar producto"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleting) return
          await softDeleteProduct(deleting.id)
          toast('Movido a papelera')
        }}
      />
    </div>
  )
}
