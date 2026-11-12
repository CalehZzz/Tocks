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
import type {
  Category,
  Location,
  Product,
  Sale,
  Store,
  StoreInvite,
  StoreMember,
  StoreStats,
} from '../types'

interface StoreContextValue {
  stores: Store[]
  store: Store | null
  locations: Location[]
  categories: Category[]
  products: Product[]
  trash: Product[]
  sales: Sale[]
  stats: StoreStats | null
  members: StoreMember[]
  invites: StoreInvite[]
  myRole: StoreMember['role'] | null
  loading: boolean
  setStoreId: (id: string) => void
  refreshStores: () => Promise<void>
  refreshStoreData: () => Promise<void>
  createStore: (name: string) => Promise<Store>
  renameStore: (name: string) => Promise<void>
  softDeleteStore: () => Promise<void>
  createLocation: (name: string, code: string) => Promise<void>
  renameLocation: (id: string, name: string, code?: string) => Promise<void>
  softDeleteLocation: (id: string) => Promise<void>
  createCategory: (name: string) => Promise<Category>
  renameCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
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
  uploadProductImage: (file: File) => Promise<string>
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
  voidSale: (saleId: string) => Promise<void>
  restoreSale: (saleId: string) => Promise<void>
  createInvite: (input: {
    email: string
    display_name: string
    role: 'admin' | 'staff'
  }) => Promise<void>
  deleteInvite: (id: string) => Promise<void>
  removeMember: (userId: string) => Promise<void>
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
  const [members, setMembers] = useState<StoreMember[]>([])
  const [invites, setInvites] = useState<StoreInvite[]>([])
  const [myRole, setMyRole] = useState<StoreMember['role'] | null>(null)
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
      setMembers([])
      setInvites([])
      setMyRole(null)
      return
    }
    setLoading(true)
    try {
      const [locs, cats, prods, deleted, saleList, storeStats, mems, invs, role] =
        await Promise.all([
          api.listLocations(store.id),
          api.listCategories(store.id),
          api.listProducts(store.id, false),
          api.listProducts(store.id, true),
          api.listSales(store.id, true),
          api.getStats(store.id),
          api.listMembers(store.id),
          api.listInvites(store.id).catch(() => [] as StoreInvite[]),
          api.getMyRole(store.id),
        ])
      setLocations(locs)
      setCategories(cats)
      setProducts(prods)
      setTrash(deleted.filter((p) => p.deleted_at))
      setSales(saleList)
      setStats(storeStats)
      setMembers(mems)
      setInvites(invs)
      setMyRole(role)
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
      members,
      invites,
      myRole,
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
      renameStore: async (name) => {
        if (!store) return
        await api.renameStore(store.id, name)
        await refreshStores()
      },
      softDeleteStore: async () => {
        if (!store) return
        await api.softDeleteStore(store.id)
        localStorage.removeItem(ACTIVE_KEY)
        setStoreIdState(null)
        await refreshStores()
      },
      createLocation: async (name, code) => {
        if (!store) return
        await api.createLocation(store.id, name, code)
        await refreshStoreData()
      },
      renameLocation: async (id, name, code) => {
        await api.renameLocation(id, name, code)
        await refreshStoreData()
      },
      softDeleteLocation: async (id) => {
        await api.softDeleteLocation(id)
        await refreshStoreData()
      },
      createCategory: async (name) => {
        if (!store) throw new Error('Sin tienda')
        const cat = await api.createCategory(store.id, name)
        await refreshStoreData()
        return cat
      },
      renameCategory: async (id, name) => {
        await api.renameCategory(id, name)
        await refreshStoreData()
      },
      deleteCategory: async (id) => {
        await api.deleteCategory(id)
        await refreshStoreData()
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
      uploadProductImage: async (file) => {
        if (!store) throw new Error('Sin tienda')
        return api.uploadProductImage(store.id, file)
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
      voidSale: async (saleId) => {
        await api.voidSale(saleId)
        await refreshStoreData()
      },
      restoreSale: async (saleId) => {
        await api.restoreSale(saleId)
        await refreshStoreData()
      },
      createInvite: async (input) => {
        if (!store) return
        await api.createInvite(store.id, input)
        await refreshStoreData()
      },
      deleteInvite: async (id) => {
        await api.deleteInvite(id)
        await refreshStoreData()
      },
      removeMember: async (userId) => {
        if (!store) return
        await api.removeMember(store.id, userId)
        await refreshStoreData()
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
      members,
      invites,
      myRole,
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
