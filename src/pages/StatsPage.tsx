import { useStore } from '../context/StoreContext'
import { money } from '../lib/money'

export function StatsPage() {
  const { store, stats } = useStore()

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Estadísticas</h1>
          <p className="page-sub">Resumen operativo de {store?.name}</p>
        </div>
      </div>
      <div className="grid-stats">
        <div className="stat">
          <div className="stat-label">Ingresos</div>
          <div className="stat-value">{money(stats?.salesTotal || 0, store?.currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Costos</div>
          <div className="stat-value">{money(stats?.costTotal || 0, store?.currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Ganancia</div>
          <div className="stat-value">{money(stats?.profit || 0, store?.currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Ventas / unidades</div>
          <div className="stat-value">
            {stats?.saleCount || 0}
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              {' '}
              · {stats?.unitsSold || 0} u
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
