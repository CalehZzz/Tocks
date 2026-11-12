import { Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom'
import {
  BarChart3,
  ExternalLink,
  FolderTree,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
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
import { CategoriesPage } from './pages/CategoriesPage'
import { TeamPage } from './pages/TeamPage'
import { AccountPage } from './pages/AccountPage'
import { useEffect, useMemo, useState } from 'react'
import { api } from './lib/api'

function posUrl(slug: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${window.location.origin}${base}/caja/${slug}`
}

function AdminShell() {
  const { user, signOut, backendMode } = useAuth()
  const { store, myRole } = useStore()
  const initials = (user?.display_name || user?.email || 'U')
    .slice(0, 1)
    .toUpperCase()

  if (myRole === 'staff') {
    return <Navigate to={store ? `/caja/${store.slug}` : '/account'} replace />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">Tk</div>
          <div>
            <div className="brand-title">Tocks</div>
            <div className="brand-sub">Panel del negocio</div>
          </div>
        </div>

        <StoreSwitcher />

        {store ? (
          <a
            className="nav-btn"
            href={posUrl(store.slug)}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <ShoppingCart size={18} />
            Abrir caja
            <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.7 }} />
          </a>
        ) : null}

        <div className="nav-group">
          <div className="nav-label">Trabajar</div>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/inventory"
          >
            <Package size={18} />
            Inventario
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/categories"
          >
            <FolderTree size={18} />
            Categorías
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
            to="/team"
          >
            <Users size={18} />
            Equipo / POS
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            to="/settings"
          >
            <Settings size={18} />
            Sedes y negocio
          </NavLink>
        </div>

        <div className="sidebar-foot">
          <div className="mode-pill">
            <span className={`mode-dot ${backendMode === 'supabase' ? 'live' : ''}`} />
            {backendMode === 'supabase' ? 'Supabase' : 'Demo local'}
          </div>
          <NavLink to="/account" className="profile-link">
            <span className="avatar">{initials}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.display_name || user?.email || 'Cuenta'}
            </span>
          </NavLink>
          <button
            className="btn btn-ghost btn-sm"
            style={{
              color: '#fff',
              borderColor: 'rgba(255,255,255,.2)',
              background: 'transparent',
            }}
            onClick={() => void signOut()}
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function PosRoute() {
  const { slug = '' } = useParams()
  const { user, loading: authLoading, signOut } = useAuth()
  const { setStoreId, store, locations, myRole } = useStore()
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (authLoading) return
      if (!user) {
        setReady(true)
        return
      }
      try {
        const found = await api.getStoreBySlug(slug)
        if (!alive) return
        if (!found) {
          setError('No tienes acceso a esta caja o el negocio no existe.')
          setReady(true)
          return
        }
        setStoreId(found.id)
        setReady(true)
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : 'No se pudo abrir la caja')
        setReady(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [slug, user, authLoading, setStoreId])

  const title = useMemo(() => store?.name || slug, [store, slug])

  if (authLoading || !ready) {
    return (
      <div className="auth-page">
        <div className="auth-card panel-pad" style={{ textAlign: 'center' }}>
          Abriendo caja…
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  if (error || !store || store.slug !== slug) {
    return (
      <div className="auth-page">
        <div className="auth-card panel-pad">
          <div className="error-box">{error || 'Caja no disponible'}</div>
          <button className="btn btn-ghost" onClick={() => void signOut()}>
            Salir
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pos-shell">
      <div className="pos-top">
        <div>
          <div className="brand-title" style={{ fontSize: '1.4rem' }}>
            Caja · {title}
          </div>
          <div className="page-sub">
            {myRole === 'staff' ? 'Acceso de cajero' : 'Vista de caja'}
            {locations[0] ? ` · ${locations[0].name}` : ''}
          </div>
        </div>
        <div className="toolbar">
          {myRole !== 'staff' ? (
            <NavLink className="btn btn-ghost btn-sm" to="/inventory">
              Volver al panel
            </NavLink>
          ) : null}
          <button className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </div>
      <PosPage />
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const { stores, loading: storeLoading, myRole, store } = useStore()

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card panel-pad" style={{ textAlign: 'center' }}>
          Cargando Tocks…
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/caja/:slug" element={<PosRoute />} />
      <Route
        path="/*"
        element={
          !user ? (
            <AuthPage />
          ) : !storeLoading && stores.length === 0 ? (
            <OnboardingPage />
          ) : myRole === 'staff' && store ? (
            <Navigate to={`/caja/${store.slug}`} replace />
          ) : (
            <AdminShell />
          )
        }
      />
    </Routes>
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
