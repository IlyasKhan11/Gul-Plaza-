import { useEffect, useState } from 'react'
import { FiPackage, FiClock } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { formatPrice, formatDate } from '@/lib/utils'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'

export function SellerOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true)
      setError(null)
      try {
        const resp = await api.get('/api/seller/orders') as { data?: any[] }
        setOrders(resp.data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [user?.id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-slate-500 text-sm mt-1">Manage orders for your store</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-20 text-center text-slate-400">Loading orders…</div>
          ) : error ? (
            <div className="py-20 text-center text-red-600">{error}</div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <FiPackage className="h-16 w-16 text-slate-200" />
                <FiClock className="h-6 w-6 text-slate-400 absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-700 mb-1">No Orders Yet</h2>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                You have not received any orders yet. Orders placed for your products will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">Order #{order.id}</span>
                      <span className="ml-2 text-xs text-slate-500">{formatDate(order.created_at || order.createdAt)}</span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    <span className="font-medium">Buyer:</span> {order.buyer_name || order.buyerName} ({order.buyer_phone || order.buyerPhone})
                  </div>
                  <div className="mt-1 text-sm text-slate-700">
                    <span className="font-medium">Total:</span> {formatPrice(order.total_amount || order.total)}
                  </div>
                  {/* Items rendering can be added if API returns them */}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
