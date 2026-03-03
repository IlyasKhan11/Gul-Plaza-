import { useState, useEffect, useCallback } from 'react'
import { FiMessageCircle, FiPackage, FiRefreshCw, FiChevronRight } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { sellerService, type SellerOrder } from '@/services/sellerService'
import { formatPrice, formatDate } from '@/lib/utils'

const STATUS_FILTER_OPTIONS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

const NEXT_STATUS: Record<string, string | null> = {
  pending: 'confirmed',
  confirmed: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
  delivered: null,
  cancelled: null,
}

const NEXT_LABEL: Record<string, string> = {
  pending: 'Confirm Order',
  confirmed: 'Mark Processing',
  processing: 'Mark Shipped',
  shipped: 'Mark Delivered',
}

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'delivered': return 'success'
    case 'cancelled': return 'destructive'
    case 'shipped': return 'default'
    case 'processing':
    case 'confirmed': return 'warning'
    default: return 'outline'
  }
}

export function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [advancing, setAdvancing] = useState<number | null>(null)

  const fetchOrders = useCallback(async (p: number, status: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await sellerService.getOrders({
        page: p,
        status: status === 'all' ? undefined : status,
        limit: 15,
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

  useEffect(() => {
    fetchOrders(1, filterStatus)
  }, [fetchOrders])

  function handleStatusFilter(value: string) {
    setFilterStatus(value)
    setPage(1)
    fetchOrders(1, value)
  }

  function changePage(newPage: number) {
    setPage(newPage)
    fetchOrders(newPage, filterStatus)
  }

  async function advanceStatus(order: SellerOrder) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setAdvancing(order.id)
    try {
      await sellerService.updateOrderStatus(order.id, next)
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setAdvancing(null)
    }
  }

  function whatsappBuyer(order: SellerOrder) {
    if (!order.buyer_phone) {
      alert('Buyer phone number is not available.')
      return
    }
    const phone = order.buyer_phone.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Hi ${order.buyer_name}! Regarding your order #${order.id} — total: Rs. ${order.total_amount}. Status: ${order.status}.`
    )
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{totalOrders} total orders</p>
        </div>
        <Select value={filterStatus} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map(s => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === 'all' ? 'All Orders' : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <CardHeader><CardTitle className="text-base">Order Management</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <FiPackage className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No orders found</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {orders.map(order => {
                  const nextStatus = NEXT_STATUS[order.status]
                  const nextLabel = NEXT_LABEL[order.status]

                  return (
                    <div
                      key={order.id}
                      className="border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/20 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-slate-400">#{order.id}</span>
                            <Badge variant={statusVariant(order.status)} className="capitalize">
                              {order.status}
                            </Badge>
                            <Badge
                              variant={order.payment_status === 'paid' ? 'success' : 'outline'}
                              className="capitalize text-xs"
                            >
                              {order.payment_status === 'paid' ? '✓ Paid' : order.payment_status}
                            </Badge>
                          </div>
                          <p className="font-semibold text-slate-900 mt-1">{order.buyer_name}</p>
                          <p className="text-xs text-slate-500">{order.buyer_email}</p>
                          {order.buyer_phone && (
                            <p className="text-xs text-slate-500">{order.buyer_phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{formatPrice(parseFloat(order.total_amount))}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.created_at)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                        {nextStatus && nextLabel && (
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => advanceStatus(order)}
                            disabled={advancing === order.id}
                          >
                            <FiChevronRight className="h-3.5 w-3.5" />
                            {advancing === order.id ? 'Updating...' : nextLabel}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs text-green-700 border-green-300 hover:bg-green-50 ml-auto"
                          onClick={() => whatsappBuyer(order)}
                        >
                          <FiMessageCircle className="h-3.5 w-3.5" /> Contact Buyer
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>Next</Button>
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
