import { useStore } from '../context/StoreContext'
import { money } from '../lib/money'

export function SalesPage() {
  const { store, sales, locations } = useStore()

  function locName(id: string) {
    return locations.find((l) => l.id === id)?.name || id
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-sub">Historial reciente de {store?.name}</p>
        </div>
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
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.invoice_number || '—'}</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                      {s.seller_email || '—'}
                    </div>
                  </td>
                  <td>{new Date(s.created_at).toLocaleString('es-SV')}</td>
                  <td>{locName(s.location_id)}</td>
                  <td>{s.customer_name || '—'}</td>
                  <td>{(s.items || []).reduce((a, i) => a + i.qty, 0)}</td>
                  <td>{money(Number(s.total), store?.currency)}</td>
                </tr>
              ))}
              {!sales.length ? (
                <tr>
                  <td colSpan={6} className="empty">
                    Todavía no hay ventas.
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
