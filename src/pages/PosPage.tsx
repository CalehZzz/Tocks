import { useEffect, useMemo, useState } from 'react'
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
    return products.filter((p) => {
      const stock = p.stock?.[activeLocation] || 0
      if (stock <= 0) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q)
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
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (existing) {
        if (existing.qty >= stock) {
          toast('Sin más stock')
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
      toast('Carrito vacío')
      return
    }
    setBusy(true)
    try {
      const sale = await checkout(activeLocation, customer, discountPct, cart)
      toast(`Venta ${sale.invoice_number || ''} confirmada`)
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
          <p className="page-sub">POS por sede · {store?.name}</p>
        </div>
        <div className="store-picker">
          <select
            value={activeLocation}
            onChange={(e) => {
              setLocationId(e.target.value)
              setCart([])
            }}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto…"
            style={{
              borderRadius: 999,
              border: '1px solid var(--line)',
              padding: '9px 14px',
              background: 'rgba(255,255,255,.75)',
            }}
          />
        </div>
      </div>

      <div className="pos-layout">
        <div className="panel panel-pad">
          <div className="product-grid">
            {visible.map((p) => (
              <button
                key={p.id}
                className="product-tile"
                onClick={() => addToCart(p.id)}
              >
                <strong>{p.name}</strong>
                <span>
                  {money(p.price, store?.currency)} · stock{' '}
                  {p.stock?.[activeLocation] || 0}
                </span>
              </button>
            ))}
            {!visible.length ? (
              <div className="empty">No hay productos con stock en esta sede.</div>
            ) : null}
          </div>
        </div>

        <div className="panel panel-pad">
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Ticket</h3>
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
                    <button onClick={() => setQty(item.productId, item.qty - 1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => setQty(item.productId, item.qty + 1)}>+</button>
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
            {!cart.length ? <div className="empty">Agrega productos al ticket.</div> : null}
          </div>

          <div className="field">
            <label>Cliente</label>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <div className="field">
            <label>Descuento venta %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPct}
              onChange={(e) => setDiscountPct(Number(e.target.value) || 0)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span>Subtotal</span>
            <strong>{money(subtotal, store?.currency)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span>Total</span>
            <strong style={{ fontSize: '1.25rem' }}>{money(total, store?.currency)}</strong>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={busy || !cart.length}
            onClick={() => void confirm()}
          >
            {busy ? 'Cobrado…' : 'Confirmar venta'}
          </button>
        </div>
      </div>
    </div>
  )
}
