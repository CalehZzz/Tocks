import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import {
  BarChart3,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
} from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StoreProvider, useStore } from './context/StoreContext'
import { ToastProvider } from './components/Toast'
import { StoreSwitcher } from './components/StoreSwitcher'
import { AuthPage } from './pages/AuthPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { InventoryPage } from './pages/InventoryPage'
import { PosPage } from './pages/PosPage'
import { SalesPage } from './pages/SalesPage'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'

function AppRoutes() {
  const { user, loading, signOut, backendMode } = useAuth()
  const { stores, loading: storeLoading } = useStore()

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
        <div className="brand-row">
          <div className="brand-mark">Tk</div>
          <div>
            <div className="brand-title">Tocks</div>
            <div className="brand-sub">Inventario simple</div>
          </div>
        </div>

        <StoreSwitcher />

        <div className="nav-group">
          <div className="nav-label">Trabajar</div>
          <NavLink className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`} to="/pos">
            <ShoppingCart size={18} />
            Caja
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/inventory"
          >
            <Package size={18} />
            Inventario
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/sales"
          >
            <Receipt size={18} />
            Ventas
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/stats"
          >
            <BarChart3 size={18} />
            Estadísticas
          </NavLink>
        </div>

        <div className="nav-group">
          <div className="nav-label">Negocio</div>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/settings"
          >
            <Settings size={18} />
            Configuración
          </NavLink>
        </div>

        <div className="sidebar-foot">
          <div className="mode-pill">
            <span className={`mode-dot ${backendMode === 'supabase' ? 'live' : ''}`} />
            {backendMode === 'supabase' ? 'Supabase' : 'Demo local'}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.2)', background: 'transparent' }} onClick={() => void signOut()}>
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/pos" replace />} />
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
