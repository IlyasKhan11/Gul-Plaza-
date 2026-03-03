import { useState, useEffect, useCallback } from 'react'
import { FiPackage, FiRefreshCw } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { sellerService, type BuyerOrder } from '@/services/sellerService'
import { formatPrice, formatDate } from '@/lib/utils'

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

function paymentVariant(status: string): 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid': return 'success'
    case 'pending': return 'warning'
    case 'failed': return 'destructive'
    default: return 'outline'
  }
}

export function BuyerOrdersPage() {
  const [orders, setOrders] = useState<BuyerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchOrders = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await sellerService.getBuyerOrders({ page: p, limit: 15 })
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
    fetchOrders(1)
  }, [fetchOrders])

  function changePage(newPage: number) {
    setPage(newPage)
    fetchOrders(newPage)
  }

  async function confirmCancel() {
    if (!cancelId) return
    setCancelling(true)
    try {
      await sellerService.cancelOrder(cancelId)
      setOrders(prev => prev.map(o => o.id === cancelId ? { ...o, status: 'cancelled' } : o))
      setCancelId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-500 text-sm mt-1">{totalOrders} orders placed</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchOrders(page)}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <FiPackage className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">You haven't placed any orders yet</p>
            <Button asChild><Link to="/products">Start Shopping</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-400">#{order.id}</span>
                        <Badge variant={statusVariant(order.status)} className="capitalize">
                          {order.status}
                        </Badge>
                        <Badge variant={paymentVariant(order.payment_status)} className="capitalize text-xs">
                          {order.payment_status === 'paid' ? '✓ Paid' : order.payment_status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-lg">{formatPrice(parseFloat(order.total_amount))}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{order.item_count} item{Number(order.item_count) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-600 hover:border-red-300 text-xs"
                        onClick={() => setCancelId(order.id)}
                      >
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Cancel Confirmation */}
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>Are you sure you want to cancel this order? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Keep Order</Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
