import { useState, useEffect, useCallback } from 'react'
import { FiPackage, FiRefreshCw, FiStar, FiSearch, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sellerService, type BuyerOrder } from '@/services/sellerService'
import { ratingService } from '@/services/ratingService'
import { formatPrice, formatDate } from '@/lib/utils'
import { RateProductDialog } from '@/components/common/RatingDialog'
import { Skeleton } from '@/components/ui/skeleton'

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

export function BuyerOrdersPage() {
  const [orders, setOrders] = useState<BuyerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [filteredOrders, setFilteredOrders] = useState<BuyerOrder[]>([])
  
  // Order detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<BuyerOrder | null>(null)
  
  // Rating state
  const [ratableProducts, setRatableProducts] = useState<{[key: string]: boolean}>({})
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<{
    product_id: number
    title: string
    store_name: string
    order_id: number
  } | null>(null)
  const [existingRating, setExistingRating] = useState<{ rating: number; review: string | null } | undefined>()

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

  // Filter orders based on search and status
  useEffect(() => {
    let filtered = [...orders]
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order => {
        const orderId = String(order.id).toLowerCase()
        const storeName = (order.store_name || '').toLowerCase()
        const productNames = order.items?.map((item: any) => (item.title || '').toLowerCase()).join(' ') || ''
        return orderId.includes(query) || storeName.includes(query) || productNames.includes(query)
      })
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }
    
    setFilteredOrders(filtered)
  }, [orders, searchQuery, statusFilter])

  // Handle view order details
  const handleViewOrder = (order: BuyerOrder) => {
    setSelectedOrder(order)
    setDetailDialogOpen(true)
  }

  // Fetch ratable products when orders are loaded
  useEffect(() => {
    if (orders.length > 0) {
      fetchRatableProducts()
    }
  }, [orders])

  const fetchRatableProducts = async () => {
    try {
      const data = await ratingService.getRatableOrders()
      const ratableMap: {[key: string]: boolean} = {}
      
      // The API returns flat array: [{order_id, product_id, product_name, primary_image, ...}, ...]
      // Each row represents a deliverable product that can be rated
      data.orders.forEach((item: any) => {
        const key = `${item.order_id}-${item.product_id}`
        ratableMap[key] = true // All items in this response can be rated
      })
      
      setRatableProducts(ratableMap)
    } catch (err) {
      console.error('Failed to fetch ratable products:', err)
    }
  }

  const handleOpenRating = async (productId: number, title: string, storeName: string, orderId: number) => {
    setSelectedProduct({ product_id: productId, title, store_name: storeName, order_id: orderId })
    
    // Check if already rated
    try {
      const existing = await ratingService.getMyRating(productId)
      setExistingRating(existing ? { rating: existing.rating, review: existing.review } : undefined)
    } catch {
      setExistingRating(undefined)
    }
    
    setRatingDialogOpen(true)
  }

  const handleRatingSuccess = () => {
    fetchRatableProducts()
    fetchOrders(page)
  }

  function changePage(newPage: number) {
    setPage(newPage)
    fetchOrders(newPage)
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
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-2">
                  <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-48" />
              </CardContent>
            </Card>
          ))}
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
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search orders by ID, store, or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          {(searchQuery || statusFilter !== 'all') && (
            <p className="text-sm text-slate-500 mb-3">
              Showing {filteredOrders.length} of {orders.length} orders
            </p>
          )}

          {/* Table Layout */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Store</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Products</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-slate-600 dark:text-slate-300">#{order.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{formatDate(order.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{order.store_name || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {order.items && order.items.slice(0, 2).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              {item.product_image ? (
                                <img src={item.product_image} alt="" className="w-8 h-8 rounded object-cover bg-slate-100" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center">
                                  <FiPackage className="h-4 w-4 text-slate-400" />
                                </div>
                              )}
                              <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{item.title}</span>
                              <span className="text-xs text-slate-400">x{item.quantity}</span>
                            </div>
                          ))}
                          {order.items && order.items.length > 2 && (
                            <span className="text-xs text-slate-400">+{order.items.length - 2} more items</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatPrice(parseFloat(order.total_amount))}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusVariant(order.status)} className="capitalize text-xs">
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                            View
                          </Button>
                          {order.status === 'delivered' && order.items && order.items.length > 0 && order.items.some((item: any) => {
                            const key = `${order.id}-${item.product_id}`
                            return ratableProducts[key]
                          }) && (
                            <Button size="sm" variant="default" className="bg-yellow-500 hover:bg-yellow-600" onClick={() => {
                              const item = order.items![0]
                              if (item && item.product_id) {
                                handleOpenRating(item.product_id, item.title || 'Product', item.store_name || 'Unknown Store', Number(order.id))
                              }
                            }}>
                              <FiStar className="h-3 w-3 mr-1" /> Rate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-slate-500">Showing {orders.length} of {totalOrders} orders</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Rating Dialog */}
      {selectedProduct && (
        <RateProductDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          product={selectedProduct}
          existingRating={existingRating}
          onSuccess={handleRatingSuccess}
        />
      )}

      {/* Order Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order Details
              <Badge variant={selectedOrder ? statusVariant(selectedOrder.status) : 'outline'} className="capitalize">
                {selectedOrder?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Order ID</p>
                  <p className="text-sm font-mono font-medium">#{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="text-sm font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Store</p>
                  <p className="text-sm font-medium">{selectedOrder.store_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-sm font-bold">{formatPrice(parseFloat(selectedOrder.total_amount))}</p>
                </div>
              </div>

              {/* Shipping Info */}
              {selectedOrder.shipping_address && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Shipping Address</p>
                  <p className="text-sm">{selectedOrder.shipping_address}, {selectedOrder.shipping_city}</p>
                </div>
              )}

              {/* Tracking Info */}
              {selectedOrder.courier_name && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tracking</p>
                  <p className="text-sm">{selectedOrder.courier_name} - {selectedOrder.tracking_number}</p>
                </div>
              )}

              {/* Transaction ID */}
              {selectedOrder.transaction_id && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Transaction ID</p>
                  <p className="text-sm font-mono">{selectedOrder.transaction_id}</p>
                </div>
              )}

              {/* Products */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Products</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="w-14 h-14 rounded-lg object-cover bg-white" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center">
                          <FiPackage className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity} × {formatPrice(item.price_at_purchase || item.price || 0)}</p>
                      </div>
                      <p className="text-sm font-bold">{formatPrice((item.price_at_purchase || item.price || 0) * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatPrice(selectedOrder.items?.reduce((sum: number, item: any) => sum + ((item.price_at_purchase || item.price || 0) * item.quantity), 0) || 0)}
                  </span>
                </div>
                {(selectedOrder as any).shipping_cost > 0 && (
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-slate-600 dark:text-slate-400">Shipping</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {formatPrice((selectedOrder as any).shipping_cost)}
                    </span>
                  </div>
                )}
                {(selectedOrder as any).tax_amount > 0 && (
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-slate-600 dark:text-slate-400">Tax</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {formatPrice((selectedOrder as any).tax_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-base font-bold border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                  <span className="text-slate-900 dark:text-slate-100">Total</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {formatPrice(parseFloat(selectedOrder.total_amount))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
