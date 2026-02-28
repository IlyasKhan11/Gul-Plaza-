import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { mockOrders } from '@/data/mockData'
import { formatPrice, formatDate } from '@/lib/utils'
import type { OrderStatus } from '@/types'

export function AdminOrdersPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const orders = filterStatus === 'all' ? mockOrders : mockOrders.filter(o => o.status === filterStatus)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{mockOrders.length} total orders across all sellers</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Order List</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left pb-3 text-slate-500 font-medium">Order ID</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Buyer</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">FiGlobe</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Items</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Total</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-mono text-xs text-slate-400">#{order.id}</td>
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{order.buyerName}</p>
                      <p className="text-xs text-slate-500">{order.buyerPhone}</p>
                    </td>
                    <td className="py-3 text-slate-600">{order.storeName}</td>
                    <td className="py-3 text-slate-600">{order.items.length} item(s)</td>
                    <td className="py-3 font-bold text-slate-900">{formatPrice(order.total)}</td>
                    <td className="py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="py-3 text-slate-400 text-xs">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
