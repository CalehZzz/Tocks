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
  StoreInvite,
  StoreMember,
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

  async claimInvites() {
    const { error } = await client().rpc('claim_store_invites')
    if (error && !/function .* does not exist/i.test(error.message)) throw error
  },

  async listStores(): Promise<Store[]> {
    await supabaseApi.claimInvites().catch(() => undefined)
    const { data, error } = await client()
      .from('stores')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getStoreBySlug(slug: string): Promise<Store | null> {
    await supabaseApi.claimInvites().catch(() => undefined)
    const { data, error } = await client()
      .from('stores')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async renameStore(storeId: string, name: string) {
    const { error } = await client()
      .from('stores')
      .update({ name: name.trim() })
      .eq('id', storeId)
    if (error) throw error
  },

  async softDeleteStore(storeId: string) {
    const { error } = await client()
      .from('stores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', storeId)
    if (error) throw error
  },

  async createStore(name: string): Promise<Store> {
    const user = await requireUserId()
    const base = slugify(name) || 'tienda'
    for (let i = 0; i < 8; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`
      // Insert without RETURNING: SELECT RLS can race the membership trigger.
      const { error } = await client().from('stores').insert({
        name: name.trim(),
        slug: candidate,
        owner_id: user.id,
        currency: 'USD',
      })
      if (error) {
        if (/duplicate|unique/i.test(error.message)) continue
        throw error
      }

      const { data, error: fetchError } = await client()
        .from('stores')
        .select('*')
        .eq('slug', candidate)
        .single()
      if (fetchError || !data) throw fetchError || new Error('Tienda creada pero no legible')

      await client().from('locations').insert({
        store_id: data.id,
        name: 'Sede principal',
        code: 'MAIN',
        sort_order: 0,
      })
      return data
    }
    throw new Error('No se pudo crear un slug único')
  },

  async listLocations(storeId: string): Promise<Location[]> {
    const { data, error } = await client()
      .from('locations')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('sort_order')
    if (error) throw error
    return data || []
  },

  async createLocation(storeId: string, name: string, code: string) {
    const { count } = await client()
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .is('deleted_at', null)
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

  async renameLocation(locationId: string, name: string, code?: string) {
    const patch: Record<string, string> = { name: name.trim() }
    if (code != null) patch.code = code.trim().toUpperCase()
    const { error } = await client().from('locations').update(patch).eq('id', locationId)
    if (error) throw error
  },

  async softDeleteLocation(locationId: string) {
    const { data: loc, error: locErr } = await client()
      .from('locations')
      .select('store_id')
      .eq('id', locationId)
      .single()
    if (locErr) throw locErr
    const { count } = await client()
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', loc.store_id)
      .is('deleted_at', null)
    if ((count || 0) <= 1) throw new Error('Debe quedar al menos una sede')
    const { error } = await client()
      .from('locations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', locationId)
    if (error) throw error
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

  async renameCategory(categoryId: string, name: string) {
    const { error } = await client()
      .from('categories')
      .update({ name: name.trim() })
      .eq('id', categoryId)
    if (error) throw error
  },

  async deleteCategory(categoryId: string) {
    const { error } = await client().from('categories').delete().eq('id', categoryId)
    if (error) throw error
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

  async listSales(storeId: string, includeVoided = true): Promise<Sale[]> {
    let q = client()
      .from('sales')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (!includeVoided) q = q.is('deleted_at', null)
    const { data, error } = await q
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

  async voidSale(saleId: string) {
    const { error } = await client().rpc('void_sale', { p_sale_id: saleId })
    if (error) throw error
  },

  async restoreSale(saleId: string) {
    const { error } = await client().rpc('restore_sale', { p_sale_id: saleId })
    if (error) throw error
  },

  async getStats(storeId: string): Promise<StoreStats> {
    const sales = (await supabaseApi.listSales(storeId, true)).filter((s) => !s.deleted_at)
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

  async listMembers(storeId: string): Promise<StoreMember[]> {
    const { data, error } = await client()
      .from('store_members')
      .select('store_id, user_id, role')
      .eq('store_id', storeId)
    if (error) throw error
    const members = data || []
    if (!members.length) return []
    const ids = members.map((m) => m.user_id)
    const { data: profiles } = await client()
      .from('profiles')
      .select('id, email, display_name')
      .in('id', ids)
    return members.map((m) => {
      const p = (profiles || []).find((x) => x.id === m.user_id)
      return {
        ...m,
        email: p?.email || null,
        display_name: p?.display_name || null,
      } as StoreMember
    })
  },

  async getMyRole(storeId: string): Promise<StoreMember['role'] | null> {
    const user = await requireUserId()
    const { data, error } = await client()
      .from('store_members')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error
    return (data?.role as StoreMember['role']) || null
  },

  async listInvites(storeId: string): Promise<StoreInvite[]> {
    const { data, error } = await client()
      .from('store_invites')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as StoreInvite[]
  },

  async createInvite(
    storeId: string,
    input: { email: string; display_name: string; role: 'admin' | 'staff' },
  ) {
    const user = await requireUserId()
    const { data, error } = await client()
      .from('store_invites')
      .insert({
        store_id: storeId,
        email: input.email.trim().toLowerCase(),
        display_name: input.display_name.trim(),
        role: input.role,
        created_by: user.id,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as StoreInvite
  },

  async deleteInvite(inviteId: string) {
    const { error } = await client().from('store_invites').delete().eq('id', inviteId)
    if (error) throw error
  },

  async removeMember(storeId: string, userId: string) {
    const { error } = await client()
      .from('store_members')
      .delete()
      .eq('store_id', storeId)
      .eq('user_id', userId)
    if (error) throw error
  },

  async uploadProductImage(storeId: string, file: File): Promise<string> {
    const { compressProductImage } = await import('./compressImage')
    const compressed = await compressProductImage(file)
    const path = `${storeId}/${crypto.randomUUID()}.jpg`
    const { error } = await client()
      .storage.from('product-images')
      .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' })
    if (error) throw error
    const { data } = client().storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  },

  async updateProfile(patch: { display_name?: string }) {
    const user = await requireUserId()
    const { error } = await client()
      .from('profiles')
      .update(patch)
      .eq('id', user.id)
    if (error) throw error
  },
}
