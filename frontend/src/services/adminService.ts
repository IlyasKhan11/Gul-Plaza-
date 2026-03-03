import { api } from '@/lib/api'

// ─── Shared response wrapper ──────────────────────────────────────────────────
interface ApiResp<T> {
  success: boolean
  data: T
}

// ─── Types matching backend output ────────────────────────────────────────────
export interface ApiUser {
  id: number
  name: string
  email: string
  role: string
  phone: string | null
  created_at: string
  has_store: boolean
  store_name: string | null
  is_blocked: boolean
}

export interface ApiOrder {
  id: number
  status: string
  total_amount: string
  payment_status: string
  created_at: string
  buyer_name: string
  buyer_phone: string | null
  store_name: string | null
  item_count: string
}

export interface ApiSeller {
  id: number
  name: string
  email: string
  phone: string | null
  created_at: string
  is_blocked: boolean
  store_id: number | null
  store_name: string | null
  description: string | null
  logo_url: string | null
  is_approved: boolean
  product_count: string
}

export interface ApiProduct {
  id: number
  title: string
  price: string
  stock: number
  is_active: boolean
  store_name: string | null
  category_name: string | null
  product_image: string | null
  rating?: string
  review_count?: string
}

export interface DashboardStats {
  total_users: number
  total_sellers: number
  total_orders: number
  total_gmv: number
  platform_revenue: number
  recent_orders: Array<{
    id: number
    status: string
    total_amount: string
    created_at: string
    buyer_name: string
    store_name: string | null
  }>
  recent_sellers: Array<{
    id: number
    seller_name: string
    store_id: number | null
    name: string | null
    logo_url: string
    is_approved: boolean
    product_count: string
  }>
}

interface Pagination {
  current_page: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const adminService = {
  // Dashboard
  async getStats(): Promise<DashboardStats> {
    const res = await api.get<ApiResp<DashboardStats>>('/admin/stats')
    return res.data
  },

  // Users
  async getUsers(params?: {
    page?: number
    search?: string
    role?: string
    limit?: number
  }): Promise<{ users: ApiUser[]; pagination: Pagination & { total_users: number } }> {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.search) qs.set('search', params.search)
    if (params?.role) qs.set('role', params.role)
    const res = await api.get<ApiResp<{ users: ApiUser[]; pagination: Pagination & { total_users: number } }>>(
      `/admin/users?${qs.toString()}`
    )
    return res.data
  },

  async blockUser(userId: number, reason?: string): Promise<void> {
    await api.patch(`/admin/users/${userId}/block`, { reason })
  },

  async unblockUser(userId: number): Promise<void> {
    await api.patch(`/admin/users/${userId}/unblock`, {})
  },

  // Orders
  async getOrders(params?: {
    page?: number
    status?: string
    limit?: number
  }): Promise<{ orders: ApiOrder[]; pagination: Pagination & { total_orders: number } }> {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.status) qs.set('status', params.status)
    const res = await api.get<ApiResp<{ orders: ApiOrder[]; pagination: Pagination & { total_orders: number } }>>(
      `/admin/orders?${qs.toString()}`
    )
    return res.data
  },

  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    await api.put(`/orders/admin/orders/${orderId}/status`, { status })
  },

  // Sellers
  async getSellers(params?: {
    page?: number
    search?: string
  }): Promise<{ sellers: ApiSeller[]; pagination: Pagination & { total_sellers: number } }> {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.search) qs.set('search', params.search)
    const res = await api.get<ApiResp<{ sellers: ApiSeller[]; pagination: Pagination & { total_sellers: number } }>>(
      `/admin/sellers?${qs.toString()}`
    )
    return res.data
  },

  async approveStore(storeId: number): Promise<{ is_approved: boolean }> {
    const res = await api.patch<ApiResp<{ store_id: number; is_approved: boolean }>>(
      `/admin/sellers/${storeId}/approve`, {}
    )
    return res.data
  },

  // Products (public endpoint, no admin prefix)
  async getProducts(params?: {
    page?: number
    search?: string
    limit?: number
  }): Promise<{ products: ApiProduct[]; pagination: Pagination & { total_products: number } }> {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.search) qs.set('search', params.search)
    const res = await api.get<ApiResp<{ products: ApiProduct[]; pagination: Pagination & { total_products: number } }>>(
      `/products?${qs.toString()}`
    )
    return res.data
  },
}
