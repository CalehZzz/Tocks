import { useMemo, useState } from 'react'
import { Receipt, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/money'
import { useToast } from '../components/Toast'
import { ConfirmTypeModal } from '../components/ConfirmTypeModal'
import type { Sale } from '../types'

export function SalesPage() {
  const { store, sales, locations, voidSale, restoreSale } = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [showVoided, setShowVoided] = useState(true)
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Sale | null>(null)

  function locName(id: string) {
    return locations.find((l) => l.id === id)?.name || id
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sales.filter((s) => {
      if (!showVoided && s.deleted_at) return false
      if (!q) return true
      return (
        (s.invoice_number || '').toLowerCase().includes(q) ||
        (s.customer_name || '').toLowerCase().includes(q) ||
        (s.seller_email || '').toLowerCase().includes(q)
      )
    })
  }, [sales, query, showVoided])

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-sub">
            Historial de {store?.name}. Anular restaura stock y saca la venta de
            estadísticas; restaurar la vuelve a contar.
          </p>
        </div>
        <div className="toolbar">
          <label className="search-input">
            <Search size={16} color="var(--muted)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar factura o cliente…"
            />
          </label>
          <label className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
            <input
              type="checkbox"
              checked={showVoided}
              onChange={(e) => setShowVoided(e.target.checked)}
            />
            Ver anuladas
          </label>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const voided = Boolean(s.deleted_at)
                return (
                  <tr key={s.id} style={voided ? { opacity: 0.65 } : undefined}>
                    <td>
                      <strong>{s.invoice_number || '—'}</strong>
                      {voided ? (
                        <span className="badge" style={{ marginLeft: 8, background: '#fee2e2', color: '#991b1b' }}>
                          Anulada
                        </span>
                      ) : null}
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
                    <td>
                      {voided ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => setRestoreTarget(s)}
                        >
                          <RotateCcw size={14} />
                          Restaurar
                        </button>
                      ) : (
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => setVoidTarget(s)}
                        >
                          <Trash2 size={14} />
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7}>
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

      <ConfirmTypeModal
        open={Boolean(voidTarget)}
        title="Anular venta"
        dangerText={`Vas a anular la factura ${voidTarget?.invoice_number || voidTarget?.id || ''}. Se devolverá el stock y la venta dejará de contar en estadísticas.`}
        confirmLabel="Anular factura"
        onClose={() => setVoidTarget(null)}
        onConfirm={async () => {
          if (!voidTarget) return
          await voidSale(voidTarget.id)
          toast('Venta anulada · stats actualizadas')
        }}
      />

      <ConfirmTypeModal
        open={Boolean(restoreTarget)}
        title="Restaurar venta"
        dangerText={`Vas a restaurar la factura ${restoreTarget?.invoice_number || restoreTarget?.id || ''}. Volverá a descontar stock y a contar en estadísticas.`}
        confirmLabel="Restaurar factura"
        onClose={() => setRestoreTarget(null)}
        onConfirm={async () => {
          if (!restoreTarget) return
          await restoreSale(restoreTarget.id)
          toast('Venta restaurada · stats actualizadas')
        }}
      />
    </div>
  )
}
