import { api } from '@/lib/api'

interface ApiResp<T> {
  success: boolean
  data: T
}

export interface ProductRating {
  id: number
  product_id: number
  buyer_id: number
  order_id: number | null
  rating: number
  review: string | null
  is_verified_purchase: boolean
  created_at: string
  buyer_name?: string
  buyer_avatar?: string
}

export interface ProductRatingSummary {
  product_id: number
  average_rating: number
  total_reviews: number
  rating_distribution: { [key: number]: number }
}

export interface RatingSubmitData {
  product_id: number
  rating: number
  review?: string
  order_id?: number
}

export const ratingService = {
  async submitRating(data: RatingSubmitData): Promise<ProductRating> {
    const res = await api.post<ApiResp<ProductRating>>('/api/ratings', data)
    return res.data
  },

  async getProductRatings(productId: number): Promise<{
    ratings: ProductRating[]
    summary: ProductRatingSummary
  }> {
    const res = await api.get<ApiResp<{
      ratings: ProductRating[]
      summary: ProductRatingSummary
    }>>(`/api/ratings/product/${productId}`)
    return res.data
  },

  async getMyRating(productId: number): Promise<ProductRating | null> {
    const res = await api.get<ApiResp<ProductRating | null>>(`/api/ratings/my-rating/${productId}`)
    return res.data
  },

  async getRatableOrders(): Promise<{
    orders: Array<{
      order_id: number
      order_status: string
      product_id: number
      product_name: string
      primary_image: string | null
    }>
  }> {
    const res = await api.get<ApiResp<{
      orders: Array<{
        order_id: number
        order_status: string
        product_id: number
        product_name: string
        primary_image: string | null
      }>
    }>>('/api/ratings/ratable')
    return res.data
  }
}
