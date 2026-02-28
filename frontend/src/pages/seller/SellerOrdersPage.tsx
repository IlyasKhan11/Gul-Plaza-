import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { useAuth } from '@/context/AuthContext'
import { mockOrders } from '@/data/mockData'
import { formatPrice, formatDate } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export function SellerOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState(mockOrders.filter(o => o.sellerId === user?.id))
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)

  function updateStatus(orderId: string, status: OrderStatus) {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{orders.length} total orders</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Order Management</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">No orders found</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(order => (
                <div key={order.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/20 transition-colors shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-400">#{order.id}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="font-semibold text-slate-900 mt-1">{order.buyerName}</p>
                      <p className="text-xs text-slate-500">{order.buyerPhone} · {order.buyerAddress}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatPrice(order.total)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    {order.items.map(item => (
                      <div key={item.product.id} className="flex items-center gap-2 text-sm text-slate-600">
                        <img src={item.product.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                        <span className="flex-1 truncate">{item.product.name}</span>
                        <span className="text-slate-400">×{item.quantity}</span>
                        <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Update status:</span>
                    <Select value={order.status} onValueChange={v => updateStatus(order.id, v as OrderStatus)}>
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
