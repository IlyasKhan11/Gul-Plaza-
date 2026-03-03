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
      await api.post('/cart', {
        product_id: parseInt(item.product.id),
        quantity: item.quantity,
      })
    }

    // 3. Create order from server cart (no body needed)
    const orderRes = await api.post<ApiResp<CreatedOrder>>('/orders')
    const order = orderRes.data

    // 4. Select payment method
    await api.post(`/orders/${order.id}/select-payment`, {
      payment_method: paymentMethod,
    })

    return order
  },
}
