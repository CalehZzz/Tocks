import { useMemo, useState } from 'react'
import { Receipt, Search } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/money'

export function SalesPage() {
  const { store, sales, locations } = useStore()
  const [query, setQuery] = useState('')

  function locName(id: string) {
    return locations.find((l) => l.id === id)?.name || id
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sales
    return sales.filter(
      (s) =>
        (s.invoice_number || '').toLowerCase().includes(q) ||
        (s.customer_name || '').toLowerCase().includes(q) ||
        (s.seller_email || '').toLowerCase().includes(q),
    )
  }, [sales, query])

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-sub">Historial de {store?.name}</p>
        </div>
        <label className="search-input">
          <Search size={16} color="var(--muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar factura o cliente…"
          />
        </label>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Fecha</th>
                <th>Sede</th>
                <th>Cliente</th>
                <th>Items</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.invoice_number || '—'}</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                      {s.seller_email || '—'}
                    </div>
                  </td>
                  <td>
                    {new Date(s.created_at).toLocaleString('es-SV', {
                      timeZone: 'America/El_Salvador',
                    })}
                  </td>
                  <td>{locName(s.location_id)}</td>
                  <td>{s.customer_name || '—'}</td>
                  <td>{(s.items || []).reduce((a, i) => a + i.qty, 0)}</td>
                  <td>{money(Number(s.total), store?.currency)}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      <div className="empty-icon">
                        <Receipt size={22} />
                      </div>
                      Todavía no hay ventas.
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
