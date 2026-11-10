import { slugify } from './id'
import { supabase } from './supabase'
import type {
  CartLine,
  Category,
  Location,
  Product,
  Profile,
  Sale,
  Store,
  StoreStats,
} from '../types'

function client() {
  if (!supabase) throw new Error('Supabase no configurado')
  return supabase
}

async function requireUserId() {
  const { data, error } = await client().auth.getUser()
  if (error || !data.user) throw new Error('No hay sesión')
  return data.user
}

async function attachStock(products: Product[]): Promise<Product[]> {
  if (!products.length) return []
  const ids = products.map((p) => p.id)
  const { data, error } = await client()
    .from('product_stock')
    .select('product_id, location_id, quantity')
    .in('product_id', ids)
  if (error) throw error
  return products.map((p) => {
    const stock: Record<string, number> = {}
    for (const row of data || []) {
      if (row.product_id === p.id) stock[row.location_id] = row.quantity
    }
    return { ...p, stock }
  })
}

export const supabaseApi = {
  mode: 'supabase' as const,

  async getSession(): Promise<Profile | null> {
    const { data } = await client().auth.getSession()
    const user = data.session?.user
    if (!user) return null
    const { data: profile } = await client()
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    return (
      profile || {
        id: user.id,
        email: user.email || null,
        display_name: user.user_metadata?.display_name || null,
      }
    )
  },

  async signUp(email: string, password: string, displayName: string) {
    const { data, error } = await client().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw error
    if (!data.user) throw new Error('No se pudo crear la cuenta')
    return supabaseApi.getSession()
  },

  async signIn(email: string, password: string) {
    const { error } = await client().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw error
    return supabaseApi.getSession()
  },

  async signOut() {
    const { error } = await client().auth.signOut()
    if (error) throw error
  },

  async listStores(): Promise<Store[]> {
    const { data, error } = await client()
      .from('stores')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  async createStore(name: string): Promise<Store> {
    const user = await requireUserId()
    const base = slugify(name) || 'tienda'
    let slug = base
    for (let i = 0; i < 8; i++) {
      const candidate = i === 0 ? slug : `${base}-${i + 1}`
      const { data, error } = await client()
        .from('stores')
        .insert({
          name: name.trim(),
          slug: candidate,
          owner_id: user.id,
          currency: 'USD',
        })
        .select('*')
        .single()
      if (!error && data) {
        await client().from('locations').insert([
          {
            store_id: data.id,
            name: 'Sede principal',
            code: 'MAIN',
            sort_order: 0,
          },
          {
            store_id: data.id,
            name: 'Sede 2',
            code: 'S2',
            sort_order: 1,
          },
        ])
        return data
      }
      if (error && !/duplicate|unique/i.test(error.message)) throw error
      slug = candidate
    }
    throw new Error('No se pudo crear un slug único')
  },

  async listLocations(storeId: string): Promise<Location[]> {
    const { data, error } = await client()
      .from('locations')
      .select('*')
      .eq('store_id', storeId)
      .order('sort_order')
    if (error) throw error
    return data || []
  },

  async createLocation(storeId: string, name: string, code: string) {
    const { count } = await client()
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
    const { data, error } = await client()
      .from('locations')
      .insert({
        store_id: storeId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        sort_order: count || 0,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as Location
  },

  async listCategories(storeId: string): Promise<Category[]> {
    const { data, error } = await client()
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async createCategory(storeId: string, name: string) {
    const { data, error } = await client()
      .from('categories')
      .insert({ store_id: storeId, name: name.trim() })
      .select('*')
      .single()
    if (error) throw error
    return data as Category
  },

  async listProducts(storeId: string, includeDeleted = false) {
    let q = client().from('products').select('*').eq('store_id', storeId)
    if (!includeDeleted) q = q.is('deleted_at', null)
    const { data, error } = await q.order('sort_order').order('name')
    if (error) throw error
    return attachStock((data || []) as Product[])
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
    const { data, error } = await client()
      .from('products')
      .insert({
        store_id: storeId,
        name: input.name.trim(),
        description: input.description?.trim() || '',
        cost: input.cost,
        price: input.price,
        category_id: input.category_id || null,
        discount_pct: input.discount_pct || 0,
        image_url: input.image_url || null,
      })
      .select('*')
      .single()
    if (error) throw error

    const locations = await supabaseApi.listLocations(storeId)
    if (locations.length) {
      const rows = locations.map((loc) => ({
        product_id: data.id,
        location_id: loc.id,
        quantity: input.stockByLocation?.[loc.id] ?? 0,
      }))
      const { error: stockError } = await client()
        .from('product_stock')
        .insert(rows)
      if (stockError) throw stockError
    }
    const [withStock] = await attachStock([data as Product])
    return withStock
  },

  async updateProduct(
    productId: string,
    patch: Partial<Product> & { stockByLocation?: Record<string, number> },
  ) {
    const { stockByLocation, ...rest } = patch
    const { data, error } = await client()
      .from('products')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select('*')
      .single()
    if (error) throw error

    if (stockByLocation) {
      for (const [locationId, quantity] of Object.entries(stockByLocation)) {
        const { error: stockError } = await client()
          .from('product_stock')
          .upsert(
            {
              product_id: productId,
              location_id: locationId,
              quantity,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'product_id,location_id' },
          )
        if (stockError) throw stockError
      }
    }
    const [withStock] = await attachStock([data as Product])
    return withStock
  },

  async softDeleteProduct(productId: string) {
    return supabaseApi.updateProduct(productId, {
      deleted_at: new Date().toISOString(),
    })
  },

  async restoreProduct(productId: string) {
    return supabaseApi.updateProduct(productId, { deleted_at: null })
  },

  async checkout(
    storeId: string,
    locationId: string,
    customerName: string,
    discountPct: number,
    items: CartLine[],
  ) {
    const payload = items.map((i) => ({
      product_id: i.productId,
      qty: i.qty,
      unit_price: i.unitPrice,
    }))
    const { data: saleId, error } = await client().rpc('checkout_sale', {
      p_store_id: storeId,
      p_location_id: locationId,
      p_customer_name: customerName,
      p_discount_pct: discountPct || 0,
      p_items: payload,
    })
    if (error) throw error

    const { data: sale, error: saleError } = await client()
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single()
    if (saleError) throw saleError

    const { data: saleItems, error: itemsError } = await client()
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId)
    if (itemsError) throw itemsError

    return { ...(sale as Sale), items: saleItems || [] }
  },

  async listSales(storeId: string): Promise<Sale[]> {
    const { data, error } = await client()
      .from('sales')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    const sales = (data || []) as Sale[]
    if (!sales.length) return []
    const { data: items, error: itemsError } = await client()
      .from('sale_items')
      .select('*')
      .in(
        'sale_id',
        sales.map((s) => s.id),
      )
    if (itemsError) throw itemsError
    return sales.map((s) => ({
      ...s,
      items: (items || []).filter((i) => i.sale_id === s.id),
    }))
  },

  async getStats(storeId: string): Promise<StoreStats> {
    const sales = await supabaseApi.listSales(storeId)
    const salesTotal = sales.reduce((a, s) => a + Number(s.total), 0)
    const costTotal = sales.reduce((a, s) => a + Number(s.cost_total), 0)
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
}
