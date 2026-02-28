import { useState } from 'react'
import { Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { useAuth } from '@/context/AuthContext'
import { mockOrders } from '@/data/mockData'
import { formatPrice, formatDate } from '@/lib/utils'

export function BuyerOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState(mockOrders.filter(o => o.buyerId === user?.id))

  function cancelOrder(id: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' as const } : o))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-500 text-sm mt-1">{orders.length} orders placed</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">You haven't placed any orders yet</p>
            <Button asChild><Link to="/products">Start Shopping</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Card key={order.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">#{order.id}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {order.storeName} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <p className="font-bold text-slate-900 text-lg">{formatPrice(order.total)}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <img src={item.product.images[0]} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover bg-slate-50" />
                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${item.product.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 line-clamp-1">
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}

                {order.status === 'pending' && (
                  <div className="flex justify-end pt-2">
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:border-red-300" onClick={() => cancelOrder(order.id)}>
                      Cancel Order
                    </Button>
                  </div>
                )}

                <div className="text-xs text-slate-400 pt-1">
                  Delivery to: {order.buyerAddress}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
