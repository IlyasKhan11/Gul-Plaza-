import { useState, useEffect, useCallback } from 'react'
import { FiPackage, FiRefreshCw, FiStar } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-lg">Total: {formatPrice(parseFloat(order.total_amount))}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {order.buyer_name && (
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-medium">Buyer:</span> {order.buyer_name} {order.buyer_phone && `(${order.buyer_phone})`}
                    </p>
                  )}
                  {order.store_name && (
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-medium">Store:</span> {order.store_name}
                    </p>
                  )}
                  {order.items && order.items.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">Products:</span>{' '}
                      </p>
                      <div className="space-y-2">
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start justify-between bg-slate-50 rounded-lg p-2">
                            <div className="flex items-start gap-3 flex-1">
                              {item.product_image ? (
                                <img src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover bg-white shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-200 shrink-0 flex items-center justify-center">
                                  <FiPackage className="h-5 w-5 text-slate-400" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-slate-800">{item.title}</p>
                                {item.store_name && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    <span className="font-medium">Store:</span> {item.store_name}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Qty: {item.quantity} × {formatPrice(item.price_at_purchase || item.price || 0)}
                                </p>
                              </div>
                            </div>
                            {/* Rate Product button for delivered orders */}
                            {order.status === 'delivered' && (
                              <div className="ml-2">
                                {(() => {
                                  const key = `${order.id}-${item.product_id}`
                                  const canRate = ratableProducts[key]
                                  
                                  return canRate !== undefined ? (
                                    <Button
                                      size="sm"
                                      variant={canRate ? "default" : "outline"}
                                      className="h-7 text-xs"
                                      onClick={() => handleOpenRating(
                                        item.product_id,
                                        item.title,
                                        item.store_name || 'Unknown Store',
                                        Number(order.id)
                                      )}
                                    >
                                      <FiStar className="h-3 w-3 mr-1" />
                                      {canRate ? 'Rate' : 'Rated'}
                                    </Button>
                                  ) : null
                                })()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.shipping_address && order.shipping_city && (
                    <p className="text-sm text-slate-500 mt-2">
                      <span className="font-medium">Shipping:</span> {order.shipping_address}, {order.shipping_city}
                    </p>
                  )}
                  {order.courier_name && order.tracking_number && (
                    <p className="text-sm text-slate-500 mt-2">
                      <span className="font-medium">Tracking:</span> {order.courier_name} - {order.tracking_number}
                    </p>
                  )}
                  {order.transaction_id && (
                    <p className="text-sm text-slate-500 mt-2">
                      <span className="font-medium">Transaction ID:</span> {order.transaction_id}
                    </p>
                  )}
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
    </div>
  )
}
