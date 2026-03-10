import { api } from '@/lib/api'

interface ApiResp<T> {
  success: boolean
  data: T
}

export type CheckoutPaymentMethod = 'COD' | 'EASYPaisa'

export interface CreatedOrder {
  id: number
  status: string
  total_amount: string
  payment_status: string
  created_at: string
}

export const orderService = {
  /**
   * Sync local cart items to the server cart, then place the order.
   * Returns the created order ID.
   */
  async checkout(
    _items: { productId: number; quantity: number }[],
    paymentMethod: CheckoutPaymentMethod,
    extra?: {
      transactionId?: string;
      shipping_address?: string;
      shipping_city?: string;
      shipping_country?: string;
      shipping_postal_code?: string;
      shipping_phone?: string;
      shipping_full_name?: string;
    }
  ): Promise<CreatedOrder> {
    // Use shipping info from extra parameter or fallback to localStorage
    let shipping_address = extra?.shipping_address || '';
    let shipping_city = extra?.shipping_city || '';
    let shipping_country = extra?.shipping_country || '';
    let shipping_postal_code = extra?.shipping_postal_code || '';
    let shipping_phone = extra?.shipping_phone || '';
    
    // Fallback to localStorage if not provided
    if (!shipping_address || !shipping_city || !shipping_country) {
      try {
        const userStr = localStorage.getItem('gul_plaza_user')
        if (userStr) {
          const user = JSON.parse(userStr)
          shipping_address = shipping_address || user.address || ''
          shipping_city = shipping_city || user.city || ''
          shipping_country = shipping_country || user.country || ''
          shipping_postal_code = shipping_postal_code || user.postal_code || ''
          shipping_phone = shipping_phone || user.phone || ''
        }
      } catch {}
    }
    
    // Only send shipping fields; backend uses cart for items
    const orderRes = await api.post<ApiResp<CreatedOrder>>('/api/orders', {
      items: _items,
      paymentMethod: paymentMethod,
      shipping_address,
      shipping_city,
      shipping_country,
      shipping_postal_code,
      shipping_phone,
      shipping_full_name: extra?.shipping_full_name,
    })
    const order = orderRes.data
    // Always send JSON — FormData cannot be serialized by api.post (uses JSON.stringify)
    const paymentPayload: Record<string, string> = {
      payment_method: paymentMethod,
    }
    if (extra?.transactionId) paymentPayload.transaction_id = extra.transactionId
    await api.post(`/api/orders/${order.id}/select-payment`, paymentPayload)
    return order
  },

  async syncCart(cartItems: { productId: number; quantity: number }[]): Promise<void> {
    await api.post('/api/cart', {
      items: cartItems
    })
  },
  }
