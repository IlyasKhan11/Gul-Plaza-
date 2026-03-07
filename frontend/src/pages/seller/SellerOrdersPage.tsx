import { useEffect, useState } from 'react'
import { FiPackage, FiClock, FiCheck, FiTruck, FiX, FiLoader, FiMessageSquare, FiSearch, FiEye, FiFilter, FiUser, FiPhone, FiMapPin, FiCreditCard } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { sellerService } from '@/services/sellerService'
import { formatPrice, formatDate } from '@/lib/utils'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { Skeleton } from '@/components/ui/skeleton'

export function SellerOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<number | null>(null)
  
  // Search, filter and pagination
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const limit = 15
  
  // Modal states
  const [showShipModal, setShowShipModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [courierName, setCourierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await sellerService.getOrders({
        page,
        limit,
        search: search || undefined,
        status: filterStatus === 'all' ? undefined : filterStatus,
      })
      setOrders(result.orders || [])
      setTotalPages(result.pagination?.total_pages || 1)
      setTotalOrders(result.pagination?.total_orders || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [user?.id, page, filterStatus])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchOrders()
  }

  const handleStatusFilter = (value: string) => {
    setFilterStatus(value)
    setPage(1)
  }

  const handleConfirm = async (orderId: number) => {
    setProcessing(orderId)
    try {
      await sellerService.confirmOrder(orderId)
      await fetchOrders()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm order')
      setShowErrorModal(true)
    } finally {
      setProcessing(null)
    }
  }

  const openShipModal = (order: any) => {
    setSelectedOrder(order)
    setCourierName('')
    setTrackingNumber('')
    setShowShipModal(true)
  }

  const handleShip = async () => {
    if (!courierName.trim() || !trackingNumber.trim()) {
      setErrorMessage('Please enter both courier name and tracking number')
      setShowErrorModal(true)
      return
    }
    setProcessing(selectedOrder.id)
    setShowShipModal(false)
    try {
      await sellerService.shipOrder(selectedOrder.id, courierName, trackingNumber)
      await fetchOrders()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to ship order')
      setShowErrorModal(true)
    } finally {
      setProcessing(null)
      setSelectedOrder(null)
    }
  }

  const handleDeliver = async (orderId: number) => {
    setProcessing(orderId)
    try {
      await sellerService.deliverOrder(orderId)
      await fetchOrders()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to mark order as delivered')
      setShowErrorModal(true)
    } finally {
      setProcessing(null)
    }
  }

  const openCancelModal = (order: any) => {
    setSelectedOrder(order)
    setCancelReason('')
    setShowCancelModal(true)
  }

  const handleCancel = async () => {
    setProcessing(selectedOrder.id)
    setShowCancelModal(false)
    try {
      await sellerService.updateOrderStatus(selectedOrder.id, 'cancelled')
      await fetchOrders()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel order')
      setShowErrorModal(true)
    } finally {
      setProcessing(null)
      setSelectedOrder(null)
    }
  }

  const handleVerifyPayment = async (orderId: number) => {
    setProcessing(orderId)
    try {
      await sellerService.verifyEasypaisaPayment(orderId)
      await fetchOrders()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to verify payment')
      setShowErrorModal(true)
    } finally {
      setProcessing(null)
    }
  }

  const handleSendWhatsApp = async (orderId: number) => {
    setProcessing(orderId)
    try {
      // Send a default message about order confirmation
      const message = 'Hello! Your order has been confirmed. We will ship it soon. Thank you for shopping with us!'
      await sellerService.sendWhatsAppMessage(orderId, message)
      setErrorMessage('WhatsApp message sent to buyer successfully!')
      setShowErrorModal(true)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send WhatsApp message')
      setShowErrorModal(true)
    } finally {
      setProcessing(null)
    }
  }

  const getAvailableActions = (order: any) => {
    const actions: { label: string; icon: any; handler: () => void; variant: 'default' | 'outline' | 'destructive' }[] = []
    
    // Pending COD orders: seller confirms then ships
    if (order.status === 'pending') {
      actions.push({
        label: 'Confirm Order',
        icon: FiCheck,
        handler: () => handleConfirm(order.id),
        variant: 'default'
      })
      actions.push({
        label: 'Cancel',
        icon: FiX,
        handler: () => openCancelModal(order),
        variant: 'destructive'
      })
    }

    // EasyPaisa orders awaiting verification: seller checks their app and verifies
    if (order.status === 'awaiting_verification') {
      actions.push({
        label: 'Verify Payment',
        icon: FiCheck,
        handler: () => handleVerifyPayment(order.id),
        variant: 'default'
      })
      actions.push({
        label: 'Cancel',
        icon: FiX,
        handler: () => openCancelModal(order),
        variant: 'destructive'
      })
    }

    // COD confirmed or EasyPaisa paid: ready to ship
    if (order.status === 'confirmed' || order.status === 'processing' || order.status === 'paid') {
      if (order.payment_method === 'COD' || order.payment_method === 'Cash on Delivery') {
        actions.push({
          label: 'Send WhatsApp',
          icon: FiMessageSquare,
          handler: () => handleSendWhatsApp(order.id),
          variant: 'outline'
        })
      }
      actions.push({
        label: 'Ship Order',
        icon: FiTruck,
        handler: () => openShipModal(order),
        variant: 'default'
      })
    }
    
    if (order.status === 'shipped') {
      actions.push({
        label: 'Mark Delivered',
        icon: FiCheck,
        handler: () => handleDeliver(order.id),
        variant: 'default'
      })
    }
    
    return actions
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-slate-500 text-sm mt-1">Manage orders for your store</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Orders</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={filterStatus} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <FiFilter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="awaiting_verification">Awaiting Verification</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:flex-initial">
              <div className="relative flex-1 sm:w-56">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by order ID, name, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="outline">Search</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border-b border-slate-100 pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-40" />
                  <div className="flex gap-2 mt-3">
                    <Skeleton className="h-8 w-28 rounded-md" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Buyer</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Products</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const actions = getAvailableActions(order)
                    return (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2">
                          <div className="font-semibold text-slate-900">#{order.id}</div>
                          <div className="text-xs text-slate-500">{formatDate(order.created_at || order.createdAt)}</div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm text-slate-900">{order.buyer_name || order.buyerName}</div>
                          <div className="text-xs text-slate-500">{order.buyer_phone || order.buyerPhone}</div>
                        </td>
                        <td className="py-3 px-2">
                          {order.items && order.items.length > 0 ? (
                            <div className="space-y-1.5">
                              {order.items.slice(0, 2).map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                  {item.product_image || item.image ? (
                                    <img
                                      src={item.product_image || item.image}
                                      alt={item.title}
                                      className="w-8 h-8 rounded object-cover shrink-0 bg-slate-100"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                                      <FiPackage className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                  )}
                                  <span className="text-sm text-slate-700 truncate max-w-[120px]">
                                    {item.title} <span className="text-slate-400">x{item.quantity}</span>
                                  </span>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-xs text-slate-500 pl-10">+{order.items.length - 2} more</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-semibold text-slate-900">{formatPrice(order.total_amount || order.totalAmount)}</span>
                        </td>
                        <td className="py-3 px-2">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm text-slate-600 capitalize">{order.payment_method || '—'}</div>
                          <div className="text-xs text-slate-500">{order.payment_status || order.paymentStatus || '—'}</div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOrder(order)
                                setShowViewModal(true)
                              }}
                              className="h-8"
                            >
                              <FiEye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                            {actions.map((action, idx) => (
                              <Button
                                key={idx}
                                size="sm"
                                variant={action.variant}
                                onClick={action.handler}
                                disabled={processing === order.id}
                                className="h-8"
                              >
                                {processing === order.id ? (
                                  <FiLoader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <action.icon className="h-3.5 w-3.5 mr-1" />
                                    {action.label}
                                  </>
                                )}
                              </Button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Showing {orders.length} of {totalOrders} orders</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ship Order Modal */}
      <Dialog open={showShipModal} onOpenChange={setShowShipModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ship Order #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Enter the shipping details to mark this order as shipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="courier">Courier Name</Label>
              <Input
                id="courier"
                placeholder="e.g., DHL, FedEx, Local Courier"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShipModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleShip} disabled={processing !== null}>
              {processing === selectedOrder?.id ? (
                <FiLoader className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Ship Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600 py-4">{errorMessage}</p>
          <DialogFooter>
            <Button onClick={() => setShowErrorModal(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Cancellation (Optional)</Label>
              <Input
                id="reason"
                placeholder="Enter reason for cancellation"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Keep Order
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={processing !== null}>
              {processing === selectedOrder?.id ? (
                <FiLoader className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Details Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
          {selectedOrder && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Order</p>
                    <h2 className="text-lg font-bold leading-tight">#{selectedOrder.id}</h2>
                  </div>
                  <div className="h-8 w-px bg-slate-600" />
                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Date</p>
                    <p className="text-sm font-medium">{formatDate(selectedOrder.created_at || selectedOrder.createdAt)}</p>
                  </div>
                </div>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>

              <div className="max-h-[68vh] overflow-y-auto">
                {/* Buyer + Payment row */}
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                  {/* Buyer */}
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <FiUser className="h-3.5 w-3.5" /> Buyer
                    </p>
                    <div className="space-y-1.5">
                      <p className="font-semibold text-slate-900 text-sm">{selectedOrder.buyer_name || selectedOrder.buyerName || 'N/A'}</p>
                      {(selectedOrder.buyer_phone || selectedOrder.buyerPhone) && (
                        <p className="text-sm text-slate-500 flex items-center gap-1.5">
                          <FiPhone className="h-3 w-3 shrink-0" />
                          {selectedOrder.buyer_phone || selectedOrder.buyerPhone}
                        </p>
                      )}
                      {(selectedOrder.shipping_address || selectedOrder.shippingAddress) && (
                        <p className="text-sm text-slate-500 flex items-start gap-1.5">
                          <FiMapPin className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="leading-snug">
                            {[
                              selectedOrder.shipping_address || selectedOrder.shippingAddress,
                              selectedOrder.shipping_city,
                              selectedOrder.shipping_country,
                            ].filter(Boolean).join(', ')}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <FiCreditCard className="h-3.5 w-3.5" /> Payment
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Method</span>
                        <span className="text-sm font-medium text-slate-900 capitalize">{selectedOrder.payment_method || selectedOrder.paymentMethod || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Status</span>
                        <span className={`text-sm font-medium capitalize ${
                          (selectedOrder.payment_status || selectedOrder.paymentStatus) === 'verified'
                            ? 'text-green-600'
                            : (selectedOrder.payment_status || selectedOrder.paymentStatus) === 'failed'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}>
                          {selectedOrder.payment_status || selectedOrder.paymentStatus || '—'}
                        </span>
                      </div>
                      {(selectedOrder.courier_name || selectedOrder.courierName) && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Courier</span>
                          <span className="text-sm font-medium text-slate-900">{selectedOrder.courier_name || selectedOrder.courierName}</span>
                        </div>
                      )}
                      {(selectedOrder.tracking_number || selectedOrder.trackingNumber) && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Tracking</span>
                          <span className="text-sm font-medium text-slate-900 font-mono">{selectedOrder.tracking_number || selectedOrder.trackingNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Products table */}
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FiPackage className="h-3.5 w-3.5" /> Products
                  </p>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left text-xs text-slate-400 font-medium pb-2 w-10"></th>
                          <th className="text-left text-xs text-slate-400 font-medium pb-2">Item</th>
                          <th className="text-center text-xs text-slate-400 font-medium pb-2 w-16">Qty</th>
                          <th className="text-right text-xs text-slate-400 font-medium pb-2 w-28">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedOrder.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2.5 pr-2">
                              {item.image || item.product_image ? (
                                <img
                                  src={item.image || item.product_image}
                                  alt={item.title || item.name}
                                  className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                  <FiPackage className="h-4 w-4 text-slate-400" />
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 pr-4">
                              <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{item.title || item.name || 'Product'}</p>
                            </td>
                            <td className="py-2.5 text-center">
                              <span className="text-sm text-slate-600">×{item.quantity || 1}</span>
                            </td>
                            <td className="py-2.5 text-right">
                              <span className="text-sm font-semibold text-slate-900">
                                {formatPrice((item.price || item.unit_price || 0) * (item.quantity || 1))}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No products found</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-slate-500 font-medium">Total</span>
                  <span className="text-2xl font-bold text-slate-900">{formatPrice(selectedOrder.total_amount || selectedOrder.totalAmount)}</span>
                </div>
                <Button onClick={() => setShowViewModal(false)} className="px-6">Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
