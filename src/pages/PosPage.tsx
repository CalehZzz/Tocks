import { useEffect, useMemo, useState } from 'react'
import {
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  UserRound,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { lineTotal, money } from '../lib/money'
import { useToast } from '../components/Toast'
import type { CartLine } from '../types'

export function PosPage() {
  const { store, products, locations, checkout } = useStore()
  const toast = useToast()
  const [locationId, setLocationId] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState('')
  const [discountPct, setDiscountPct] = useState(0)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!locationId && locations[0]) setLocationId(locations[0].id)
  }, [locations, locationId])

  const activeLocation = locationId || locations[0]?.id || ''

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => (!q ? true : p.name.toLowerCase().includes(q)))
      .sort((a, b) => {
        const sa = a.stock?.[activeLocation] || 0
        const sb = b.stock?.[activeLocation] || 0
        if ((sa > 0) !== (sb > 0)) return sa > 0 ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [products, activeLocation, query])

  const subtotal = cart.reduce(
    (a, i) => a + lineTotal(i.unitPrice, i.qty, i.discountPct),
    0,
  )
  const total = +(subtotal * (1 - discountPct / 100)).toFixed(2)

  function addToCart(productId: string) {
    const p = products.find((x) => x.id === productId)
    if (!p) return
    const stock = p.stock?.[activeLocation] || 0
    if (stock <= 0) {
      toast('Sin stock en esta sede')
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (existing) {
        if (existing.qty >= stock) {
          toast('No hay más stock')
          return prev
        }
        return prev.map((i) =>
          i.productId === productId ? { ...i, qty: i.qty + 1 } : i,
        )
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          qty: 1,
          unitPrice: p.price,
          cost: p.cost,
          discountPct: p.discount_pct || 0,
        },
      ]
    })
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, qty } : i))
        .filter((i) => i.qty > 0),
    )
  }

  async function confirm() {
    if (!activeLocation) {
      toast('Elige una sede')
      return
    }
    if (!cart.length) {
      toast('Agrega productos al ticket')
      return
    }
    setBusy(true)
    try {
      const sale = await checkout(activeLocation, customer, discountPct, cart)
      toast(`Venta ${sale.invoice_number || ''} lista`)
      setCart([])
      setCustomer('')
      setDiscountPct(0)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo cobrar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Caja</h1>
          <p className="page-sub">Vende rápido en {store?.name}</p>
        </div>
        <div className="toolbar">
          <label className="search-input" style={{ borderRadius: 12 }}>
            <MapPin size={16} color="var(--muted)" />
            <select
              value={activeLocation}
              onChange={(e) => {
                setLocationId(e.target.value)
                setCart([])
              }}
              style={{ border: 0, outline: 'none', background: 'transparent', width: '100%' }}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="search-input">
            <Search size={16} color="var(--muted)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
            />
          </label>
        </div>
      </div>

      <div className="pos-layout">
        <div className="panel panel-pad">
          <div className="product-grid">
            {visible.map((p) => {
              const stock = p.stock?.[activeLocation] || 0
              const out = stock <= 0
              return (
                <button
                  key={p.id}
                  className={`product-tile${out ? ' out' : ''}`}
                  onClick={() => addToCart(p.id)}
                  disabled={out}
                  title={out ? 'Sin stock' : 'Agregar al ticket'}
                >
                  <strong>{p.name}</strong>
                  <span className="meta">{money(p.price, store?.currency)}</span>
                  {out ? (
                    <span className="badge badge-warn">Sin stock</span>
                  ) : (
                    <span className="badge">{stock} u</span>
                  )}
                </button>
              )
            })}
            {!visible.length ? (
              <div className="empty">
                <div className="empty-icon">
                  <ShoppingCart size={22} />
                </div>
                No hay productos. Crea algunos en Inventario.
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel panel-pad">
          <h3 style={{ margin: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <ShoppingCart size={18} />
            Ticket
          </h3>
          <div className="cart-lines">
            {cart.map((item) => (
              <div className="cart-line" key={item.productId}>
                <div>
                  <strong>{item.name}</strong>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {money(item.unitPrice, store?.currency)}
                    {item.discountPct ? ` · -${item.discountPct}%` : ''}
                  </div>
                  <div className="qty-controls">
                    <button type="button" onClick={() => setQty(item.productId, item.qty - 1)}>
                      <Minus size={14} />
                    </button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => setQty(item.productId, item.qty + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <strong>
                  {money(
                    lineTotal(item.unitPrice, item.qty, item.discountPct),
                    store?.currency,
                  )}
                </strong>
              </div>
            ))}
            {!cart.length ? (
              <div className="empty" style={{ padding: 18 }}>
                Toca un producto para agregarlo.
              </div>
            ) : null}
          </div>

          <div className="field">
            <label>Cliente</label>
            <div className="search-input" style={{ borderRadius: 12, minWidth: 0 }}>
              <UserRound size={16} color="var(--muted)" />
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="field">
            <label>Descuento de la venta %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPct}
              onChange={(e) => setDiscountPct(Number(e.target.value) || 0)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Subtotal</span>
            <strong>{money(subtotal, store?.currency)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span>Total</span>
            <strong style={{ fontSize: '1.25rem' }}>{money(total, store?.currency)}</strong>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={busy || !cart.length}
            onClick={() => void confirm()}
          >
            {busy ? 'Cobrado…' : 'Cobrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
