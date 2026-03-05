import { api } from '@/lib/api'

// ─── Shared response wrapper ──────────────────────────────────────────────────
interface ApiResp<T> {
  success: boolean
  data: T
}

// ─── Types matching backend output ────────────────────────────────────────────
export interface ApiUser {
  id: number
  username: string
  email: string
  role: string
  phone: string | null
  created_at: string
  has_store: boolean
  store_name: string | null
  is_blocked?: boolean
}

export interface ApiOrder {
  id: number
  status: string
  total_amount: string
  created_at: string
  customer_name: string
  customer_email: string
  currency: string | null
  item_count: string
}

export interface ApiSeller {
  id: number
  username: string
  email: string
  phone: string | null
  created_at: string
  is_blocked?: boolean
  has_store: boolean
  store_name: string | null
}

export interface ApiCategory {
  id: number
  name: string
  slug: string
  parent_id: number | null
  parent_name: string | null
  created_at: string
  updated_at: string
}

export interface ApiReport {
  id: number
  product_id: number
  product_title: string
  store_name: string | null
  reporter_name: string
  reporter_email: string
  reason: string
  description: string | null
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed'
  admin_notes: string | null
  created_at: string
}

export interface ApiSellerApplication {
  id: number
  name: string
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  city: string | null
  country: string | null
  postal_code: string | null
  business_license: string | null
  tax_id: string | null
  is_active: boolean
  created_at: string
  owner_id: number
  owner_name?: string
  owner_email?: string
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
  total_products: number
  total_orders: number
  total_revenue: number
  pending_orders: number
  low_stock_products_count: number
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
    const res = await api.get<ApiResp<DashboardStats>>('/api/admin/dashboard/summary')
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
      `/api/admin/users?${qs.toString()}`
    )
    return res.data
  },

  async blockUser(userId: number, reason?: string): Promise<void> {
    await api.patch(`/api/admin/users/${userId}/block`, { reason })
  },

  async unblockUser(userId: number): Promise<void> {
    await api.patch(`/api/admin/users/${userId}/unblock`, {})
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
      `/api/admin/orders?${qs.toString()}`
    )
    return res.data
  },

  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    await api.put(`/api/admin/orders/${orderId}/status`, { status })
  },

  // Sellers — uses GET /admin/users?role=seller, maps to ApiSeller shape
  async getSellers(params?: {
    page?: number
    search?: string
  }): Promise<{ sellers: ApiSeller[]; pagination: Pagination & { total_sellers: number } }> {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.search) qs.set('search', params.search)
    qs.set('role', 'seller')
    const res = await api.get<ApiResp<{ users: ApiUser[]; pagination: Pagination & { total_users: number } }>>(
      `/api/admin/users?${qs.toString()}`
    )
    const sellers: ApiSeller[] = res.data.users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      created_at: u.created_at,
      is_blocked: u.is_blocked,
      has_store: u.has_store,
      store_name: u.store_name,
    }))
    return {
      sellers,
      pagination: {
        ...res.data.pagination,
        total_sellers: res.data.pagination.total_users,
      },
    }
  },

  // Categories
  async getCategories(): Promise<ApiCategory[]> {
    const res = await api.get<ApiResp<ApiCategory[]>>('/api/categories')
    return res.data
  },

  async createCategory(data: { name: string; slug: string; parent_id?: number }): Promise<ApiCategory> {
    const res = await api.post<ApiResp<ApiCategory>>('/api/categories', data)
    return res.data
  },

  async updateCategory(id: number, data: { name?: string; slug?: string; parent_id?: number | null }): Promise<ApiCategory> {
    const res = await api.put<ApiResp<ApiCategory>>(`/api/categories/${id}`, data)
    return res.data
  },

  async deleteCategory(id: number): Promise<void> {
    await api.delete(`/api/categories/${id}`)
  },

  // Seller Applications
  async getSellerApplications(): Promise<ApiSellerApplication[]> {
    const res = await api.get<ApiResp<ApiSellerApplication[]>>('/api/admin/seller-applications')
    return res.data
  },

  async approveSellerApplication(storeId: number): Promise<void> {
    await api.post(`/api/admin/seller-applications/${storeId}/approve`)
  },

  async rejectSellerApplication(storeId: number, reason?: string): Promise<void> {
    await api.post(`/api/admin/seller-applications/${storeId}/reject`, { reason })
  },

  // Reports
  async getReports(params?: {
    page?: number
    status?: string
    limit?: number
  }): Promise<{ reports: ApiReport[]; pagination: Pagination & { total_reports: number } }> {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.status) qs.set('status', params.status)
    const res = await api.get<ApiResp<{ reports: ApiReport[]; pagination: Pagination & { total_reports: number } }>>(
      `/api/admin/reports?${qs.toString()}`
    )
    return res.data
  },

  async updateReportStatus(id: number, status: string, admin_notes?: string): Promise<void> {
    await api.put(`/api/admin/reports/${id}/status`, { status, admin_notes })
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
      `/api/products?${qs.toString()}`
    )
    return res.data
  },
}
