import { useEffect, useState } from 'react'
import { FiPackage, FiClock, FiCheck, FiTruck, FiX, FiLoader, FiMessageSquare } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  
  // Modal states
  const [showShipModal, setShowShipModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [courierName, setCourierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await sellerService.getOrders()
      setOrders(result.orders || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [user?.id])

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
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
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
            <div className="space-y-4">
              {orders.map(order => {
                const actions = getAvailableActions(order)
                return (
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
                    {order.store_name && (
                      <div className="mt-1 text-sm text-slate-700">
                        <span className="font-medium">Store:</span> {order.store_name}
                      </div>
                    )}
                    {order.items && order.items.length > 0 && (
                      <div className="mt-1 text-sm text-slate-700">
                        <span className="font-medium">Products:</span>{' '}
                        {order.items.map((item: any, idx: number) => (
                          <span key={idx}>
                            {item.title} x{item.quantity}
                            {idx < order.items.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 text-sm text-slate-700">
                      <span className="font-medium">Total:</span> {formatPrice(order.total_amount || order.totalAmount)}
                    </div>
                    {order.payment_method && (
                      <div className="mt-1 text-sm text-slate-600">
                        <span className="font-medium">Payment:</span> {order.payment_method}
                      </div>
                    )}
                    {order.shipping_address && (
                      <div className="mt-1 text-sm text-slate-600">
                        <span className="font-medium">Shipping:</span> {order.shipping_address}, {order.shipping_city}
                      </div>
                    )}
                    {order.tracking_number && (
                      <div className="mt-1 text-sm text-slate-600">
                        <span className="font-medium">Tracking:</span> {order.courier_name} - {order.tracking_number}
                      </div>
                    )}
                    {order.transaction_id && (
                      <div className="mt-1 text-sm text-slate-600">
                        <span className="font-medium">Transaction ID:</span> {order.transaction_id}
                      </div>
                    )}
                    {actions.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {actions.map((action, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant={action.variant}
                            onClick={action.handler}
                            disabled={processing === order.id}
                          >
                            {processing === order.id ? (
                              <FiLoader className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <action.icon className="h-4 w-4 mr-1" />
                                {action.label}
                              </>
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
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
    </div>
  )
}
