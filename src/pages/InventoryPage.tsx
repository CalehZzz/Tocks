import { useMemo, useState, type FormEvent } from 'react'
import { DollarSign, Package, PackagePlus, Search, Trash2 } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/money'
import { useToast } from '../components/Toast'

export function InventoryPage() {
  const {
    store,
    products,
    locations,
    categories,
    createProduct,
    createCategory,
    softDeleteProduct,
    updateProduct,
  } = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [discount, setDiscount] = useState('0')
  const [categoryId, setCategoryId] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [stockMap, setStockMap] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    )
  }, [products, query])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      let cat = categoryId || null
      if (newCategory.trim()) {
        const created = await createCategory(newCategory.trim())
        cat = created.id
      }
      const stockByLocation: Record<string, number> = {}
      for (const loc of locations) {
        stockByLocation[loc.id] = Number(stockMap[loc.id] || 0)
      }
      await createProduct({
        name,
        description,
        cost: Number(cost),
        price: Number(price),
        discount_pct: Number(discount) || 0,
        category_id: cat,
        stockByLocation,
      })
      setName('')
      setDescription('')
      setCost('')
      setPrice('')
      setDiscount('0')
      setCategoryId('')
      setNewCategory('')
      setStockMap({})
      setShowForm(false)
      toast('Producto guardado')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error al crear')
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
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            <PackagePlus size={16} />
            {showForm ? 'Cerrar' : 'Nuevo producto'}
          </button>
        </div>
      </div>

      {showForm ? (
        <form className="panel panel-pad" onSubmit={onCreate} style={{ marginBottom: 16 }}>
          <div className="grid-2">
            <div>
              <div className="field">
                <label>Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Resistencia 10k"
                  required
                />
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Opcional: detalles del producto"
                />
              </div>
              <div className="field">
                <label>Categoría</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>O nueva categoría</label>
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Ej. Componentes"
                />
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
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.50"
                    required
                  />
                </div>
                <div className="field-hint">Lo que te cuesta a ti. Ej: 0.50</div>
              </div>
              <div className="field">
                <label>Precio de venta</label>
                <div className="money-input">
                  <DollarSign size={18} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1.25"
                    required
                  />
                </div>
                <div className="field-hint">Lo que cobras al cliente. Ej: 1.25</div>
              </div>
              <div className="field">
                <label>Descuento tienda %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
              {locations.map((loc) => (
                <div className="field" key={loc.id}>
                  <label>Stock · {loc.name}</label>
                  <input
                    type="number"
                    min="0"
                    value={stockMap[loc.id] || ''}
                    onChange={(e) =>
                      setStockMap((m) => ({ ...m, [loc.id]: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy}>
            <Package size={16} />
            {busy ? 'Guardando…' : 'Guardar producto'}
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
                    <strong>{p.name}</strong>
                    {p.discount_pct > 0 ? (
                      <span className="badge" style={{ marginLeft: 8 }}>
                        -{p.discount_pct}%
                      </span>
                    ) : null}
                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                      {p.description || 'Sin descripción'}
                    </div>
                  </td>
                  <td>{money(p.price, store?.currency)}</td>
                  <td>{money(p.cost, store?.currency)}</td>
                  {locations.map((l) => (
                    <td key={l.id}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => void quickRestock(p.id, l.id)}
                        title="Sumar stock"
                      >
                        {p.stock?.[l.id] ?? 0}
                      </button>
                    </td>
                  ))}
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() =>
                        void softDeleteProduct(p.id).then(() => toast('Movido a papelera'))
                      }
                    >
                      <Trash2 size={14} />
                      Quitar
                    </button>
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
    </div>
  )
}
