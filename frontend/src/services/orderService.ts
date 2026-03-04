import { api } from '@/lib/api'
import type { CartItem } from '@/types'

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
    extra?: { transactionId?: string; screenshot?: File }
  ): Promise<CreatedOrder> {
    // Get shipping info from user context/localStorage
    let shipping_address = ''
    let shipping_city = ''
    let shipping_country = ''
    let shipping_postal_code = ''
    let shipping_phone = ''
    try {
      const userStr = localStorage.getItem('gul_plaza_user')
      if (userStr) {
        const user = JSON.parse(userStr)
        shipping_address = user.address || ''
        shipping_city = user.city || ''
        shipping_country = user.country || ''
        shipping_postal_code = user.postal_code || ''
        shipping_phone = user.phone || ''
      }
    } catch {}
    // Only send shipping fields; backend uses cart for items
    const orderRes = await api.post<ApiResp<CreatedOrder>>('/orders', {
      shipping_address,
      shipping_city,
      shipping_country,
      shipping_postal_code,
      shipping_phone,
    })
    const order = orderRes.data
    // Prepare payment payload
    const paymentPayload: any = {
      payment_method: paymentMethod,
    }
    if (extra?.transactionId) paymentPayload.transaction_id = extra.transactionId
    if (extra?.screenshot) {
      // Use FormData for file upload
      const formData = new FormData()
      formData.append('payment_method', paymentMethod)
      formData.append('transaction_id', extra.transactionId || '')
      formData.append('screenshot', extra.screenshot)
      await api.post(`/orders/${order.id}/select-payment`, formData)
    } else {
      await api.post(`/orders/${order.id}/select-payment`, paymentPayload)
    }
    return order
  },

  async syncCart(cartItems: { productId: number; quantity: number }[]): Promise<void> {
    await api.post('/cart', {
      items: cartItems
    })
  },
  }
