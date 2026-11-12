import { slugify, uid } from './id'
import { lineTotal } from './money'
import type {
  CartLine,
  Category,
  Location,
  Product,
  Profile,
  Sale,
  SaleItem,
  Store,
  StoreInvite,
  StoreMember,
  StoreStats,
} from '../types'

const KEY = 'tocks.demo.v2'

interface DemoUser {
  id: string
  email: string
  password: string
  display_name: string
}

interface DemoDB {
  users: DemoUser[]
  sessionUserId: string | null
  profiles: Profile[]
  stores: Store[]
  members: { store_id: string; user_id: string; role: 'owner' | 'admin' | 'staff' }[]
  locations: Location[]
  categories: Category[]
  products: Product[]
  stock: { product_id: string; location_id: string; quantity: number }[]
  sales: Sale[]
  saleItems: SaleItem[]
  invites: StoreInvite[]
}

function emptyDb(): DemoDB {
  return {
    users: [],
    sessionUserId: null,
    profiles: [],
    stores: [],
    members: [],
    locations: [],
    categories: [],
    products: [],
    stock: [],
    sales: [],
    saleItems: [],
    invites: [],
  }
}

function load(): DemoDB {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyDb()
    return { ...emptyDb(), ...JSON.parse(raw) } as DemoDB
  } catch {
    return emptyDb()
  }
}

function save(db: DemoDB) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

function withStock(db: DemoDB, product: Product): Product {
  const stock: Record<string, number> = {}
  for (const row of db.stock.filter((s) => s.product_id === product.id)) {
    stock[row.location_id] = row.quantity
  }
  return { ...product, stock }
}

export const demoApi = {
  mode: 'demo' as const,

  getSession() {
    const db = load()
    if (!db.sessionUserId) return null
    const profile = db.profiles.find((p) => p.id === db.sessionUserId) || null
    return profile
  },

  async signUp(email: string, password: string, displayName: string) {
    const db = load()
    const normalized = email.trim().toLowerCase()
    if (db.users.some((u) => u.email === normalized)) {
      throw new Error('Ese correo ya está registrado (demo).')
    }
    const id = uid('user')
    db.users.push({
      id,
      email: normalized,
      password,
      display_name: displayName || normalized.split('@')[0],
    })
    db.profiles.push({
      id,
      email: normalized,
      display_name: displayName || normalized.split('@')[0],
    })
    db.sessionUserId = id
    save(db)
    return demoApi.getSession()
  },

  async signIn(email: string, password: string) {
    const db = load()
    const normalized = email.trim().toLowerCase()
    const user = db.users.find(
      (u) => u.email === normalized && u.password === password,
    )
    if (!user) throw new Error('Correo o contraseña incorrectos (demo).')
    db.sessionUserId = user.id
    save(db)
    return demoApi.getSession()
  },

  async signOut() {
    const db = load()
    db.sessionUserId = null
    save(db)
  },

  async claimInvites() {
    const db = load()
    const userId = db.sessionUserId
    if (!userId) return 0
    const profile = db.profiles.find((p) => p.id === userId)
    if (!profile?.email) return 0
    let count = 0
    for (const inv of db.invites) {
      if (inv.accepted_at) continue
      if (inv.email.toLowerCase() !== profile.email.toLowerCase()) continue
      const existing = db.members.find(
        (m) => m.store_id === inv.store_id && m.user_id === userId,
      )
      if (existing) existing.role = inv.role
      else db.members.push({ store_id: inv.store_id, user_id: userId, role: inv.role })
      inv.accepted_at = new Date().toISOString()
      if (!profile.display_name && inv.display_name) profile.display_name = inv.display_name
      count++
    }
    save(db)
    return count
  },

  async listStores() {
    const db = load()
    await demoApi.claimInvites()
    const userId = db.sessionUserId
    if (!userId) return []
    const ids = new Set(
      db.members.filter((m) => m.user_id === userId).map((m) => m.store_id),
    )
    return db.stores.filter((s) => ids.has(s.id) && !s.deleted_at)
  },

  async getStoreBySlug(slug: string) {
    await demoApi.claimInvites()
    const db = load()
    const userId = db.sessionUserId
    if (!userId) return null
    const store = db.stores.find((s) => s.slug === slug && !s.deleted_at)
    if (!store) return null
    if (!db.members.some((m) => m.store_id === store.id && m.user_id === userId)) return null
    return store
  },

  async renameStore(storeId: string, name: string) {
    const db = load()
    const store = db.stores.find((s) => s.id === storeId)
    if (!store) throw new Error('Negocio no encontrado')
    store.name = name.trim()
    save(db)
  },

  async softDeleteStore(storeId: string) {
    const db = load()
    const store = db.stores.find((s) => s.id === storeId)
    if (!store) throw new Error('Negocio no encontrado')
    store.deleted_at = new Date().toISOString()
    save(db)
  },

  async createStore(name: string) {
    const db = load()
    const owner = db.sessionUserId
    if (!owner) throw new Error('No hay sesión')
    const base = slugify(name) || 'tienda'
    let slug = base
    let n = 1
    while (db.stores.some((s) => s.slug === slug)) {
      slug = `${base}-${n++}`
    }
    const store: Store = {
      id: uid('store'),
      name: name.trim(),
      slug,
      currency: 'USD',
      owner_id: owner,
      created_at: new Date().toISOString(),
    }
    db.stores.push(store)
    db.members.push({ store_id: store.id, user_id: owner, role: 'owner' })

    db.locations.push({
      id: uid('loc'),
      store_id: store.id,
      name: 'Sede principal',
      code: 'MAIN',
      sort_order: 0,
    })
    save(db)
    return store
  },

  async listLocations(storeId: string) {
    const db = load()
    return db.locations
      .filter((l) => l.store_id === storeId && !l.deleted_at)
      .sort((a, b) => a.sort_order - b.sort_order)
  },

  async createLocation(storeId: string, name: string, code: string) {
    const db = load()
    const loc: Location = {
      id: uid('loc'),
      store_id: storeId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      sort_order: db.locations.filter((l) => l.store_id === storeId && !l.deleted_at)
        .length,
    }
    db.locations.push(loc)
    save(db)
    return loc
  },

  async renameLocation(locationId: string, name: string, code?: string) {
    const db = load()
    const loc = db.locations.find((l) => l.id === locationId)
    if (!loc) throw new Error('Sede no encontrada')
    loc.name = name.trim()
    if (code != null) loc.code = code.trim().toUpperCase()
    save(db)
  },

  async softDeleteLocation(locationId: string) {
    const db = load()
    const loc = db.locations.find((l) => l.id === locationId)
    if (!loc) throw new Error('Sede no encontrada')
    const active = db.locations.filter(
      (l) => l.store_id === loc.store_id && !l.deleted_at,
    )
    if (active.length <= 1) throw new Error('Debe quedar al menos una sede')
    loc.deleted_at = new Date().toISOString()
    save(db)
  },

  async listCategories(storeId: string) {
    return load().categories.filter((c) => c.store_id === storeId)
  },

  async createCategory(storeId: string, name: string) {
    const db = load()
    const cat: Category = {
      id: uid('cat'),
      store_id: storeId,
      name: name.trim(),
    }
    db.categories.push(cat)
    save(db)
    return cat
  },

  async renameCategory(categoryId: string, name: string) {
    const db = load()
    const cat = db.categories.find((c) => c.id === categoryId)
    if (!cat) throw new Error('Categoría no encontrada')
    cat.name = name.trim()
    save(db)
  },

  async deleteCategory(categoryId: string) {
    const db = load()
    db.categories = db.categories.filter((c) => c.id !== categoryId)
    for (const p of db.products) {
      if (p.category_id === categoryId) p.category_id = null
    }
    save(db)
  },

  async listProducts(storeId: string, includeDeleted = false) {
    const db = load()
    return db.products
      .filter(
        (p) =>
          p.store_id === storeId &&
          (includeDeleted ? true : p.deleted_at === null),
      )
      .map((p) => withStock(db, p))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  },

  async createProduct(
    storeId: string,
    input: {
      name: string
      description?: string
      cost: number
      price: number
      category_id?: string | null
      discount_pct?: number
      image_url?: string | null
      stockByLocation?: Record<string, number>
    },
  ) {
    const db = load()
    const now = new Date().toISOString()
    const product: Product = {
      id: uid('prod'),
      store_id: storeId,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      cost: input.cost,
      price: input.price,
      image_url: input.image_url || null,
      category_id: input.category_id || null,
      discount_pct: input.discount_pct || 0,
      sort_order: 0,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    }
    db.products.push(product)
    const locations = db.locations.filter((l) => l.store_id === storeId)
    for (const loc of locations) {
      db.stock.push({
        product_id: product.id,
        location_id: loc.id,
        quantity: input.stockByLocation?.[loc.id] ?? 0,
      })
    }
    save(db)
    return withStock(db, product)
  },

  async updateProduct(
    productId: string,
    patch: Partial<Product> & { stockByLocation?: Record<string, number> },
  ) {
    const db = load()
    const idx = db.products.findIndex((p) => p.id === productId)
    if (idx < 0) throw new Error('Producto no encontrado')
    const { stockByLocation, ...rest } = patch
    db.products[idx] = {
      ...db.products[idx],
      ...rest,
      updated_at: new Date().toISOString(),
    }
    if (stockByLocation) {
      for (const [locationId, qty] of Object.entries(stockByLocation)) {
        const sIdx = db.stock.findIndex(
          (s) => s.product_id === productId && s.location_id === locationId,
        )
        if (sIdx >= 0) db.stock[sIdx].quantity = qty
        else
          db.stock.push({
            product_id: productId,
            location_id: locationId,
            quantity: qty,
          })
      }
    }
    save(db)
    return withStock(db, db.products[idx])
  },

  async softDeleteProduct(productId: string) {
    return demoApi.updateProduct(productId, {
      deleted_at: new Date().toISOString(),
    })
  },

  async restoreProduct(productId: string) {
    return demoApi.updateProduct(productId, { deleted_at: null })
  },

  async checkout(
    storeId: string,
    locationId: string,
    customerName: string,
    discountPct: number,
    items: CartLine[],
  ) {
    const db = load()
    if (!items.length) throw new Error('La venta está vacía')
    const seller = db.profiles.find((p) => p.id === db.sessionUserId)
    let subtotal = 0
    let costTotal = 0

    for (const item of items) {
      const product = db.products.find(
        (p) => p.id === item.productId && p.store_id === storeId && !p.deleted_at,
      )
      if (!product) throw new Error(`Producto no encontrado: ${item.name}`)
      const stock = db.stock.find(
        (s) => s.product_id === product.id && s.location_id === locationId,
      )
      if (!stock || stock.quantity < item.qty) {
        throw new Error(`Stock insuficiente: ${product.name}`)
      }
      subtotal += lineTotal(item.unitPrice, item.qty, item.discountPct)
      costTotal += +(product.cost * item.qty).toFixed(4)
    }

    const total = +(subtotal * (1 - (discountPct || 0) / 100)).toFixed(4)
    const seq = db.sales.filter((s) => s.store_id === storeId).length + 1
    const sale: Sale = {
      id: uid('sale'),
      store_id: storeId,
      location_id: locationId,
      seller_id: seller?.id || null,
      seller_email: seller?.email || null,
      customer_name: customerName || '',
      invoice_number: `FAC-${String(seq).padStart(5, '0')}`,
      subtotal: +subtotal.toFixed(4),
      discount_pct: discountPct || 0,
      total,
      cost_total: +costTotal.toFixed(4),
      created_at: new Date().toISOString(),
    }
    db.sales.unshift(sale)

    for (const item of items) {
      const product = db.products.find((p) => p.id === item.productId)!
      const stock = db.stock.find(
        (s) => s.product_id === product.id && s.location_id === locationId,
      )!
      stock.quantity -= item.qty
      const saleItem: SaleItem = {
        id: uid('si'),
        sale_id: sale.id,
        product_id: product.id,
        product_name: product.name,
        qty: item.qty,
        unit_price: item.unitPrice,
        discount_pct: item.discountPct,
        line_total: lineTotal(item.unitPrice, item.qty, item.discountPct),
        cost_total: +(product.cost * item.qty).toFixed(4),
      }
      db.saleItems.push(saleItem)
    }

    save(db)
    return { ...sale, items: db.saleItems.filter((i) => i.sale_id === sale.id) }
  },

  async listSales(storeId: string, includeVoided = true) {
    const db = load()
    return db.sales
      .filter((s) => s.store_id === storeId && (includeVoided || !s.deleted_at))
      .map((s) => ({
        ...s,
        items: db.saleItems.filter((i) => i.sale_id === s.id),
      }))
  },

  async voidSale(saleId: string) {
    const db = load()
    const sale = db.sales.find((s) => s.id === saleId)
    if (!sale) throw new Error('Venta no encontrada')
    if (sale.deleted_at) throw new Error('La venta ya está anulada')
    const items = db.saleItems.filter((i) => i.sale_id === saleId)
    for (const item of items) {
      if (!item.product_id) continue
      const stock = db.stock.find(
        (s) => s.product_id === item.product_id && s.location_id === sale.location_id,
      )
      if (stock) stock.quantity += item.qty
      else
        db.stock.push({
          product_id: item.product_id,
          location_id: sale.location_id,
          quantity: item.qty,
        })
    }
    sale.deleted_at = new Date().toISOString()
    sale.deleted_by = db.sessionUserId
    save(db)
  },

  async restoreSale(saleId: string) {
    const db = load()
    const sale = db.sales.find((s) => s.id === saleId)
    if (!sale) throw new Error('Venta no encontrada')
    if (!sale.deleted_at) throw new Error('La venta no está anulada')
    const items = db.saleItems.filter((i) => i.sale_id === saleId)
    for (const item of items) {
      if (!item.product_id) continue
      const stock = db.stock.find(
        (s) => s.product_id === item.product_id && s.location_id === sale.location_id,
      )
      if (!stock || stock.quantity < item.qty) {
        throw new Error('Stock insuficiente para restaurar la venta')
      }
      stock.quantity -= item.qty
    }
    sale.deleted_at = null
    sale.deleted_by = null
    save(db)
  },

  async getStats(storeId: string): Promise<StoreStats> {
    const sales = (await demoApi.listSales(storeId, true)).filter((s) => !s.deleted_at)
    const salesTotal = sales.reduce((a, s) => a + s.total, 0)
    const costTotal = sales.reduce((a, s) => a + s.cost_total, 0)
    const unitsSold = sales.reduce(
      (a, s) => a + (s.items || []).reduce((b, i) => b + i.qty, 0),
      0,
    )
    return {
      salesTotal,
      costTotal,
      profit: salesTotal - costTotal,
      saleCount: sales.length,
      unitsSold,
    }
  },

  async listMembers(storeId: string): Promise<StoreMember[]> {
    const db = load()
    return db.members
      .filter((m) => m.store_id === storeId)
      .map((m) => {
        const p = db.profiles.find((x) => x.id === m.user_id)
        return {
          ...m,
          email: p?.email || null,
          display_name: p?.display_name || null,
        }
      })
  },

  async getMyRole(storeId: string) {
    const db = load()
    const userId = db.sessionUserId
    if (!userId) return null
    return db.members.find((m) => m.store_id === storeId && m.user_id === userId)?.role || null
  },

  async listInvites(storeId: string) {
    return load().invites.filter((i) => i.store_id === storeId)
  },

  async createInvite(
    storeId: string,
    input: { email: string; display_name: string; role: 'admin' | 'staff' },
  ) {
    const db = load()
    const invite: StoreInvite = {
      id: uid('inv'),
      store_id: storeId,
      email: input.email.trim().toLowerCase(),
      display_name: input.display_name.trim(),
      role: input.role,
      created_at: new Date().toISOString(),
      accepted_at: null,
    }
    db.invites.push(invite)
    save(db)
    return invite
  },

  async deleteInvite(inviteId: string) {
    const db = load()
    db.invites = db.invites.filter((i) => i.id !== inviteId)
    save(db)
  },

  async removeMember(storeId: string, userId: string) {
    const db = load()
    const store = db.stores.find((s) => s.id === storeId)
    if (store?.owner_id === userId) throw new Error('No puedes quitar al dueño')
    db.members = db.members.filter(
      (m) => !(m.store_id === storeId && m.user_id === userId),
    )
    save(db)
  },

  async uploadProductImage(_storeId: string, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
      reader.readAsDataURL(file)
    })
  },

  async updateProfile(patch: { display_name?: string }) {
    const db = load()
    const profile = db.profiles.find((p) => p.id === db.sessionUserId)
    if (!profile) throw new Error('Sin perfil')
    if (patch.display_name != null) profile.display_name = patch.display_name
    save(db)
  },

  reset() {
    localStorage.removeItem(KEY)
  },
}
