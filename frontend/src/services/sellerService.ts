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
  currency: string | null
  created_at: string
  updated_at: string
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
      '/api/sellers/profile'
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
    const res = await api.post<ApiResp<SellerStore>>('/api/sellers/store', data)
    return res.data
  },

  async applyForSeller(data: {
    name: string
    description?: string
    contact_email?: string
    contact_phone?: string
    address?: string
    city?: string
    country?: string
    postal_code?: string
    business_license?: string
    tax_id?: string
  }): Promise<ApiResp<{ store: SellerStore }>> {
    const res = await api.post<ApiResp<{ store: SellerStore }>>('/api/sellers/apply', data)
    return { success: true, data: res.data }
  },

  async updateStore(data: {
    store_name?: string
    logo_url?: string
    banner_url?: string
    description?: string
    contact_email?: string
    contact_phone?: string
  }): Promise<SellerStore> {
    const res = await api.put<ApiResp<SellerStore>>('/api/sellers/store', data)
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

  // Orders (seller)
  // When backend adds the endpoint, replace above
  async getOrders(_params?: { page?: number; status?: string; limit?: number }): Promise<{
    orders: SellerOrder[]
    pagination: Pagination & { total_orders: number }
  }> {
    throw new Error('Seller orders endpoint is not yet available. Please ask the backend developer to add GET /api/orders/seller/my-orders.')
  },

  async updateOrderStatus(_orderId: number, _status: string): Promise<void> {
    throw new Error('Seller order status update is not yet available in the backend.')
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
    }>>(`/orders?${qs}`)
    return res.data
  },

  async cancelOrder(_orderId: number): Promise<void> {
    throw new Error('Order cancellation is not yet available in the backend.')
  },

  // Categories (public)
  async getCategories(): Promise<ApiCategory[]> {
    const res = await api.get<ApiResp<ApiCategory[]>>('/categories')
    return res.data
  },
}
