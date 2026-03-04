import { api } from '@/lib/api'
import type { CartItem } from '@/types'

interface ApiResp<T> {
  success: boolean
  data: T
}

export type CheckoutPaymentMethod = 'COD' | 'BANK_TRANSFER'

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
    cartItems: CartItem[],
    paymentMethod: CheckoutPaymentMethod
  ): Promise<CreatedOrder> {
    // 1. Clear server cart first to avoid stale items
    await api.delete('/cart').catch(() => {})

    // 2. Add each local cart item to the server cart
    for (const item of cartItems) {
      const productId = Number(item.product.id)
      if (!productId || isNaN(productId)) {
        throw new Error(`Invalid product ID: ${item.product.id}`)
      }
      await api.post('/cart', {
        product_id: productId,
        quantity: item.quantity,
      })
    }

    // 3. Create order from server cart, send shipping info from user context
    let shipping_address = ''
    let shipping_city = ''
    let shipping_phone = ''
    try {
      const userStr = localStorage.getItem('gul_plaza_user')
      if (userStr) {
        const user = JSON.parse(userStr)
        shipping_address = user.address || ''
        shipping_city = user.city || ''
        shipping_phone = user.phone || ''
      }
    } catch {}
    const orderRes = await api.post<ApiResp<CreatedOrder>>('/orders', {
      shipping_address,
      shipping_city,
      shipping_phone,
    })
    const order = orderRes.data

    // 4. Select payment method
    await api.post(`/orders/${order.id}/select-payment`, {
      payment_method: paymentMethod,
    })

    return order
  },
}
