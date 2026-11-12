export type MemberRole = 'owner' | 'admin' | 'staff'

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
}

export interface Store {
  id: string
  name: string
  slug: string
  currency: string
  owner_id: string
  created_at: string
  deleted_at?: string | null
}

export interface Location {
  id: string
  store_id: string
  name: string
  code: string
  sort_order: number
  deleted_at?: string | null
}

export interface StoreInvite {
  id: string
  store_id: string
  email: string
  display_name: string
  role: 'admin' | 'staff'
  created_at: string
  accepted_at: string | null
}

export interface StoreMember {
  store_id: string
  user_id: string
  role: MemberRole
  email?: string | null
  display_name?: string | null
}

export interface Category {
  id: string
  store_id: string
  name: string
}

export interface Product {
  id: string
  store_id: string
  name: string
  description: string
  cost: number
  price: number
  image_url: string | null
  category_id: string | null
  discount_pct: number
  sort_order: number
  deleted_at: string | null
  created_at: string
  updated_at: string
  stock?: Record<string, number>
}

export interface Sale {
  id: string
  store_id: string
  location_id: string
  seller_id: string | null
  seller_email: string | null
  customer_name: string
  invoice_number: string | null
  subtotal: number
  discount_pct: number
  total: number
  cost_total: number
  created_at: string
  deleted_at?: string | null
  deleted_by?: string | null
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  product_name: string
  qty: number
  unit_price: number
  discount_pct: number
  line_total: number
  cost_total: number
}

export interface CartLine {
  productId: string
  name: string
  qty: number
  unitPrice: number
  cost: number
  discountPct: number
}

export interface StoreStats {
  salesTotal: number
  costTotal: number
  profit: number
  saleCount: number
  unitsSold: number
}
