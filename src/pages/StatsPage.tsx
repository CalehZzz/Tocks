import { useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  Coins,
  Package,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/money'
import { MONTH_NAMES, computeStats, filterSalesByMonth } from '../lib/stats'

export function StatsPage() {
  const { store, sales } = useStore()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const years = useMemo(() => {
    const set = new Set<number>([now.getFullYear()])
    for (const s of sales) set.add(new Date(s.created_at).getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [sales, now])

  const monthSales = useMemo(
    () => filterSalesByMonth(sales, year, month),
    [sales, year, month],
  )
  const stats = useMemo(() => computeStats(monthSales), [monthSales])

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Estadísticas</h1>
          <p className="page-sub">
            {MONTH_NAMES[month - 1]} {year} · {store?.name}
          </p>
        </div>
        <div className="filters">
          <div className="field" style={{ marginBottom: 0, minWidth: 140 }}>
            <label>
              <CalendarDays size={12} style={{ marginRight: 4 }} />
              Mes
            </label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 110 }}>
            <label>Año</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid-stats">
        <div className="stat">
          <div className="stat-label">
            <Wallet size={14} /> Ingresos
          </div>
          <div className="stat-value">{money(stats.salesTotal, store?.currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <Coins size={14} /> Costos
          </div>
          <div className="stat-value">{money(stats.costTotal, store?.currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <TrendingUp size={14} /> Ganancia
          </div>
          <div className="stat-value">{money(stats.profit, store?.currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <Package size={14} /> Ventas / unidades
          </div>
          <div className="stat-value">
            {stats.saleCount}
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              {' '}
              · {stats.unitsSold} u
            </span>
          </div>
        </div>
      </div>

      <div className="panel panel-pad">
        <h3 style={{ marginTop: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <BarChart3 size={18} />
          Ventas del mes
        </h3>
        {!monthSales.length ? (
          <div className="empty">No hay ventas en {MONTH_NAMES[month - 1]} {year}.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Costo</th>
                  <th>Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {monthSales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.invoice_number || '—'}</td>
                    <td>
                      {new Date(s.created_at).toLocaleDateString('es-SV', {
                        timeZone: 'America/El_Salvador',
                      })}
                    </td>
                    <td>{money(Number(s.total), store?.currency)}</td>
                    <td>{money(Number(s.cost_total), store?.currency)}</td>
                    <td>
                      {money(Number(s.total) - Number(s.cost_total), store?.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
