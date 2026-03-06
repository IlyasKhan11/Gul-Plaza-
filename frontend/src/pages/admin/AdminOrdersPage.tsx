import { useState, useEffect, useCallback } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { adminService, type ApiOrder } from '@/services/adminService'
import { formatPrice, formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)

  const fetchOrders = useCallback(async (p: number, status: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getOrders({
        page: p,
        limit: 15,
        status: status === 'all' ? undefined : status,
      })
      setOrders(data.orders)
      setTotalPages(data.pagination.total_pages)
      setTotalOrders(data.pagination.total_orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders(1, 'all') }, [fetchOrders])

  function handleStatusChange(status: string) {
    setFilterStatus(status)
    setPage(1)
    fetchOrders(1, status)
  }

  function changePage(newPage: number) {
    setPage(newPage)
    fetchOrders(newPage, filterStatus)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{totalOrders} total orders across all sellers</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => fetchOrders(page, filterStatus)} disabled={loading}>
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchOrders(page, filterStatus)}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Order List</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-3 text-slate-500 font-medium">Order ID</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Customer</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Items</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Total</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3"><Skeleton className="h-3 w-12" /></td>
                      <td className="py-3 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </td>
                      <td className="py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="py-3"><Skeleton className="h-3 w-24" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">No orders found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left pb-3 text-slate-500 font-medium">Order ID</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Customer</th>
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
                          <p className="font-medium text-slate-800">{order.customer_name}</p>
                          <p className="text-xs text-slate-500">{order.customer_email}</p>
                        </td>
                        <td className="py-3 text-slate-600">{order.item_count} item(s)</td>
                        <td className="py-3 font-bold text-slate-900">{formatPrice(parseFloat(order.total_amount))}</td>
                        <td className="py-3"><OrderStatusBadge status={order.status as never} /></td>
                        <td className="py-3 text-slate-400 text-xs">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changePage(page - 1)}>
                      Previous
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
