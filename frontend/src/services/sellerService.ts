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
  id: number | string
  status: string
  total_amount: string
  currency: string | null
  created_at: string
  updated_at: string
  item_count: string
  store_name?: string
  buyer_name?: string
  buyer_phone?: string
  shipping_address?: string
  shipping_city?: string
  items?: Array<{ product_id?: number; title: string; quantity: number; price_at_purchase?: number; price?: number; store_name?: string; product_image?: string }>
  courier_name?: string
  tracking_number?: string
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
    const res = await api.get<{ success: boolean; data: { user: unknown; profile: unknown; store: SellerStore | null } }>(
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
    }>>(`/api/products/seller/my-products?${qs}`)
    return res.data
  },

  async createProduct(data: {
    title: string
    description: string
    price: number
    stock: number
    category_id: number
    images?: string[]
  }): Promise<SellerProduct> {
    const res = await api.post<ApiResp<SellerProduct>>('/api/products', data)
    return res.data
  },

  async updateProduct(
    productId: number,
    data: { title?: string; description?: string; price?: number; stock?: number; category_id?: number; is_active?: boolean; images?: string[] }
  ): Promise<SellerProduct> {
    const res = await api.put<ApiResp<SellerProduct>>(`/api/products/${productId}`, data)
    return res.data
  },

  async deleteProduct(productId: number): Promise<void> {
    await api.delete(`/api/products/${productId}`)
  },

  // Orders (seller)
  async getOrders(params?: { page?: number; status?: string; limit?: number }): Promise<{
    orders: SellerOrder[]
    pagination: Pagination & { total_orders: number }
  }> {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.status) qs.set('status', params.status)
    const res = await api.get<{
      success: boolean
      message?: string
      data: {
        orders: SellerOrder[]
        pagination: Pagination & { total_orders: number }
      }
    }>(`/api/seller/orders?${qs}`)
    return res.data
  },

  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    await api.patch(`/api/seller/orders/${orderId}/status`, { status })
  },

  async confirmOrder(orderId: number, notes?: string): Promise<void> {
    await api.post(`/api/seller/orders/${orderId}/confirm`, { notes })
  },

  async shipOrder(orderId: number, courier_name: string, tracking_number: string): Promise<void> {
    await api.post(`/api/seller/orders/${orderId}/ship`, { courier_name, tracking_number })
  },

  async deliverOrder(orderId: number): Promise<void> {
    await api.post(`/api/seller/orders/${orderId}/deliver`)
  },

  // Send WhatsApp message to buyer
  async sendWhatsAppMessage(orderId: number, message: string): Promise<{ success: boolean; messageId?: string }> {
    const res = await api.post(`/api/seller/orders/${orderId}/whatsapp`, { message })
    return res.data
  },

  // Verify payment for COD order
  async verifyCODPayment(orderId: number): Promise<void> {
    await api.post(`/api/seller/orders/${orderId}/confirm`, { notes: 'COD payment verified - buyer will pay on delivery' })
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
    }>>(`/api/orders?${qs}`)
    return res.data
  },

  async cancelOrder(_orderId: number): Promise<void> {
    throw new Error('Order cancellation is not yet available in the backend.')
  },

  // Get monthly revenue for seller dashboard
  async getMonthlyRevenue(months: number = 6): Promise<{
    monthly_revenue: Array<{ month: string; month_name: string; order_count: number; revenue: number }>
    total_revenue: number
  }> {
    const res = await api.get<any>(`/api/seller/orders/revenue/monthly?months=${months}`)
    return res.data.data
  },

  // Get seller earnings/transactions
  async getSellerEarnings(): Promise<{
    transactions: Array<{
      id: number
      order_id: number
      amount: number
      status: string
      created_at: string
      approved_at: string | null
    }>
    totals: {
      total_earned: number
      pending_release: number
      withdrawn: number
    }
    pagination: {
      current_page: number
      total_count: number
    }
  }> {
    const res = await api.get<any>(`/api/seller/earnings`)
    return res.data.data
  },

  // Categories (public)
  async getCategories(): Promise<ApiCategory[]> {
    const res = await api.get<ApiResp<ApiCategory[]>>('/api/categories')
    return res.data
  },
}
