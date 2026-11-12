import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import type { Category, Location, Product, Sale, Store, StoreStats } from '../types'

interface StoreContextValue {
  stores: Store[]
  store: Store | null
  locations: Location[]
  categories: Category[]
  products: Product[]
  trash: Product[]
  sales: Sale[]
  stats: StoreStats | null
  loading: boolean
  setStoreId: (id: string) => void
  refreshStores: () => Promise<void>
  refreshStoreData: () => Promise<void>
  createStore: (name: string) => Promise<Store>
  createLocation: (name: string, code: string) => Promise<void>
  createCategory: (name: string) => Promise<Category>
  createProduct: (input: {
    name: string
    description?: string
    cost: number
    price: number
    category_id?: string | null
    discount_pct?: number
    image_url?: string | null
    stockByLocation?: Record<string, number>
  }) => Promise<void>
  updateProduct: (
    id: string,
    patch: Partial<Product> & { stockByLocation?: Record<string, number> },
  ) => Promise<void>
  softDeleteProduct: (id: string) => Promise<void>
  restoreProduct: (id: string) => Promise<void>
  checkout: (
    locationId: string,
    customerName: string,
    discountPct: number,
    items: {
      productId: string
      name: string
      qty: number
      unitPrice: number
      cost: number
      discountPct: number
    }[],
  ) => Promise<Sale>
}

const StoreContext = createContext<StoreContextValue | null>(null)
const ACTIVE_KEY = 'tocks.activeStore'

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY),
  )
  const [locations, setLocations] = useState<Location[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [trash, setTrash] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<StoreStats | null>(null)
  const [loading, setLoading] = useState(false)

  const store = stores.find((s) => s.id === storeId) || stores[0] || null

  const setStoreId = useCallback((id: string) => {
    setStoreIdState(id)
    localStorage.setItem(ACTIVE_KEY, id)
  }, [])

  const refreshStores = useCallback(async () => {
    if (!user) {
      setStores([])
      return
    }
    try {
      const list = await api.listStores()
      setStores(list)
      if (!list.length) {
        setStoreIdState(null)
        return
      }
      const preferred =
        list.find((s) => s.id === storeId) ||
        list.find((s) => s.id === localStorage.getItem(ACTIVE_KEY)) ||
        list[0]
      setStoreIdState(preferred.id)
      localStorage.setItem(ACTIVE_KEY, preferred.id)
    } catch (err) {
      console.error('Failed to load stores', err)
      setStores([])
    }
  }, [user, storeId])

  const refreshStoreData = useCallback(async () => {
    if (!store) {
      setLocations([])
      setCategories([])
      setProducts([])
      setTrash([])
      setSales([])
      setStats(null)
      return
    }
    setLoading(true)
    try {
      const [locs, cats, prods, deleted, saleList, storeStats] =
        await Promise.all([
          api.listLocations(store.id),
          api.listCategories(store.id),
          api.listProducts(store.id, false),
          api.listProducts(store.id, true),
          api.listSales(store.id),
          api.getStats(store.id),
        ])
      setLocations(locs)
      setCategories(cats)
      setProducts(prods)
      setTrash(deleted.filter((p) => p.deleted_at))
      setSales(saleList)
      setStats(storeStats)
    } catch (err) {
      console.error('Failed to load store data', err)
    } finally {
      setLoading(false)
    }
  }, [store])

  useEffect(() => {
    void refreshStores()
  }, [user])

  useEffect(() => {
    void refreshStoreData()
  }, [store?.id])

  const value = useMemo<StoreContextValue>(
    () => ({
      stores,
      store,
      locations,
      categories,
      products,
      trash,
      sales,
      stats,
      loading,
      setStoreId,
      refreshStores,
      refreshStoreData,
      createStore: async (name) => {
        const created = await api.createStore(name)
        await refreshStores()
        setStoreId(created.id)
        return created
      },
      createLocation: async (name, code) => {
        if (!store) return
        await api.createLocation(store.id, name, code)
        await refreshStoreData()
      },
      createCategory: async (name) => {
        if (!store) throw new Error('Sin tienda')
        const cat = await api.createCategory(store.id, name)
        await refreshStoreData()
        return cat
      },
      createProduct: async (input) => {
        if (!store) return
        await api.createProduct(store.id, input)
        await refreshStoreData()
      },
      updateProduct: async (id, patch) => {
        await api.updateProduct(id, patch)
        await refreshStoreData()
      },
      softDeleteProduct: async (id) => {
        await api.softDeleteProduct(id)
        await refreshStoreData()
      },
      restoreProduct: async (id) => {
        await api.restoreProduct(id)
        await refreshStoreData()
      },
      checkout: async (locationId, customerName, discountPct, items) => {
        if (!store) throw new Error('Sin tienda')
        const sale = await api.checkout(
          store.id,
          locationId,
          customerName,
          discountPct,
          items,
        )
        await refreshStoreData()
        return sale
      },
    }),
    [
      stores,
      store,
      locations,
      categories,
      products,
      trash,
      sales,
      stats,
      loading,
      setStoreId,
      refreshStores,
      refreshStoreData,
    ],
  )

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
