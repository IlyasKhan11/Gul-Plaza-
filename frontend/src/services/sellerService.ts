import { api } from '@/lib/api'

interface ApiResp<T> {
  success: boolean
  data: T
}

interface Pagination {
  current_page: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SellerStore {
  id: number
  name: string
  logo_url: string | null
  banner_url: string | null
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  city: string | null
  is_active: boolean
  is_approved: boolean
  created_at: string
}

export interface SellerProduct {
  id: number
  title: string
  description: string
  price: string
  stock: number
  is_active: boolean
  category_name: string | null
  primary_image: string | null
  created_at: string
}

export interface SellerOrder {
  id: number
  status: string
  total_amount: string
  payment_status: string
  created_at: string
  buyer_name: string
  buyer_email: string
  buyer_phone: string | null
}

export interface BuyerOrder {
  id: number
  status: string
  total_amount: string
  payment_status: string
  created_at: string
  item_count: string
}

export interface ApiCategory {
  id: number
  name: string
  slug: string
  icon: string | null
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const sellerService = {
  // Store
  async getProfile() {
    const res = await api.get<ApiResp<{ user: unknown; profile: unknown; store: SellerStore | null }>>(
      '/sellers/profile'
    )
    return res.data
  },

  async createStore(data: {
    store_name: string
    logo_url?: string
    banner_url?: string
    description?: string
    contact_email?: string
    contact_phone?: string
  }): Promise<SellerStore> {
    const res = await api.post<ApiResp<SellerStore>>('/sellers/store', data)
    return res.data
  },

  async updateStore(data: {
    store_name?: string
    logo_url?: string
    banner_url?: string
    description?: string
    contact_email?: string
    contact_phone?: string
  }): Promise<SellerStore> {
    const res = await api.put<ApiResp<SellerStore>>('/sellers/store', data)
    return res.data
  },

  // Products
  async getProducts(params?: { page?: number; search?: string; limit?: number }) {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.search) qs.set('search', params.search)
    const res = await api.get<ApiResp<{
      products: SellerProduct[]
      pagination: Pagination & { total_products: number }
    }>>(`/products/seller/my-products?${qs}`)
    return res.data
  },

  async createProduct(data: {
    title: string
    description: string
    price: number
    stock: number
    category_id: number
  }): Promise<SellerProduct> {
    const res = await api.post<ApiResp<SellerProduct>>('/products', data)
    return res.data
  },

  async updateProduct(
    productId: number,
    data: { title?: string; description?: string; price?: number; stock?: number; category_id?: number; is_active?: boolean }
  ): Promise<SellerProduct> {
    const res = await api.put<ApiResp<SellerProduct>>(`/products/${productId}`, data)
    return res.data
  },

  async deleteProduct(productId: number): Promise<void> {
    await api.delete(`/products/${productId}`)
  },

  // Orders
  async getOrders(params?: { page?: number; status?: string; limit?: number }) {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.status) qs.set('status', params.status)
    const res = await api.get<ApiResp<{
      orders: SellerOrder[]
      pagination: Pagination & { total_orders: number }
    }>>(`/orders/seller/my-orders?${qs}`)
    return res.data
  },

  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    await api.patch(`/orders/${orderId}/seller-status`, { status })
  },

  // Buyer orders
  async getBuyerOrders(params?: { page?: number; status?: string; limit?: number }) {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.status) qs.set('status', params.status)
    const res = await api.get<ApiResp<{
      orders: BuyerOrder[]
      pagination: Pagination & { total_orders: number }
    }>>(`/orders/buyer/my-orders?${qs}`)
    return res.data
  },

  async cancelOrder(orderId: number): Promise<void> {
    await api.patch(`/orders/${orderId}/cancel`, {})
  },

  // Categories (public)
  async getCategories(): Promise<ApiCategory[]> {
    const res = await api.get<ApiResp<ApiCategory[]>>('/categories')
    return res.data
  },
}
