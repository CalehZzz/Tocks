import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StoreProvider, useStore } from './context/StoreContext'
import { ToastProvider } from './components/Toast'
import { AuthPage } from './pages/AuthPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { InventoryPage } from './pages/InventoryPage'
import { PosPage } from './pages/PosPage'
import { SalesPage } from './pages/SalesPage'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'

function AppRoutes() {
  const { user, loading, signOut, backendMode } = useAuth()
  const { stores, store, setStoreId, loading: storeLoading } = useStore()

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card panel-pad" style={{ textAlign: 'center' }}>
          Cargando Tocks…
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage />
  if (!storeLoading && stores.length === 0) return <OnboardingPage />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Tk</div>
          <div>
            <div className="brand-title">Tocks</div>
            <div className="brand-sub">{store?.name || 'Tu tienda'}</div>
          </div>
        </div>

        <div className="nav-group">
          <div className="nav-label">Operación</div>
          <NavLink className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`} to="/pos">
            Caja
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/inventory"
          >
            Inventario
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/sales"
          >
            Ventas
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/stats"
          >
            Estadísticas
          </NavLink>
        </div>

        <div className="nav-group">
          <div className="nav-label">Cuenta</div>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/settings"
          >
            Configuración
          </NavLink>
        </div>

        <div className="sidebar-foot">
          <div className="mode-pill">
            <span className={`mode-dot ${backendMode === 'supabase' ? 'live' : ''}`} />
            {backendMode === 'supabase' ? 'Supabase' : 'Demo local'}
          </div>
          {stores.length > 1 ? (
            <select
              value={store?.id || ''}
              onChange={(e) => setStoreId(e.target.value)}
              style={{
                width: '100%',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,.15)',
                background: 'rgba(255,255,255,.06)',
                color: '#fff',
                padding: '8px 10px',
              }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
          <button className="btn btn-ghost" style={{ color: '#fff' }} onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <StoreProvider>
          <AppRoutes />
        </StoreProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
