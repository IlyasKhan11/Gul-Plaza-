import { api } from '@/lib/api'

export interface WishlistItem {
  wishlist_id: number
  saved_at: string
  id: number
  title: string
  price: string
  stock: number
  is_active: boolean
  store_name: string
  store_id: number
  primary_image: string | null
}

interface ApiResp<T> { success: boolean; data: T }

export const wishlistService = {
  async getWishlist(): Promise<WishlistItem[]> {
    const res = await api.get<ApiResp<WishlistItem[]>>('/api/wishlist')
    return res.data
  },

  async check(productId: number): Promise<boolean> {
    const res = await api.get<ApiResp<{ saved: boolean }>>(`/api/wishlist/${productId}/check`)
    return res.data.saved
  },

  async add(productId: number): Promise<void> {
    await api.post(`/api/wishlist/${productId}`, {})
  },

  async remove(productId: number): Promise<void> {
    await api.delete(`/api/wishlist/${productId}`)
  },
}
