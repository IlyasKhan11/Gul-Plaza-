import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FiCheckCircle, FiShoppingBag,
  FiCreditCard, FiAlertCircle, FiLoader,
  FiMapPin, FiPhone, FiMessageCircle, FiShield,
} from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/context/CartContext'
import { orderService, type CheckoutPaymentMethod, type CreatedOrder } from '@/services/orderService'
import { sellerService } from '@/services/sellerService'
import { api } from '@/lib/api'
import { formatPrice, cn } from '@/lib/utils'

type Stage = 'form' | 'success'

const PAYMENT_OPTIONS: {
  id: CheckoutPaymentMethod
  label: string
  desc: string
}[] = [
  {
    id: 'COD',
    label: 'Cash on Delivery',
    desc: 'Pay in cash when your order arrives. The seller will confirm before shipping.',
  },
  {
    id: 'EASYPaisa',
    label: 'Easypaisa / Bank Transfer',
    desc: "Transfer via Easypaisa or bank. Admin will verify your payment and notify the seller.",
  },
]

export function CheckoutPage() {
  const { items, total, clearCart } = useCart()

  const [stage, setStage] = useState<Stage>('form')
  const [placedOrder, setPlacedOrder] = useState<CreatedOrder | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('COD')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Shipping information
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    postalCode: ''
  })
  
  // For Easypaisa/Bank Transfer
  const [transactionId, setTransactionId] = useState('')

  // Seller contact info fetched from backend
  const [sellerContacts, setSellerContacts] = useState<Record<string, { contact_phone: string | null; contact_email: string | null }>>({})

  // Server-verified total — fetched from backend to prevent price manipulation
  const [serverTotal, setServerTotal] = useState<number | null>(null)
  const [serverTotalLoading, setServerTotalLoading] = useState(false)

  const grandTotal = serverTotal ?? total

  // Fetch server-computed cart total on mount
  useEffect(() => {
    if (items.length === 0) return
    setServerTotalLoading(true)
    api.get<{ success: boolean; data: { subtotal: string; total_items: number } }>('/api/cart/summary')
      .then(res => {
        if (res.success) setServerTotal(parseFloat(res.data.subtotal))
      })
      .catch(() => {})
      .finally(() => setServerTotalLoading(false))
  }, [items])

  // Get unique sellers from cart items
  const getSellers = () => {
    const sellerMap = new Map()
    items.forEach(({ product }) => {
      if (product && product.storeName) {
        const sellerId = product.sellerId || 'unknown'
        if (!sellerMap.has(sellerId)) {
          sellerMap.set(sellerId, {
            id: sellerId,
            name: product.storeName,
            products: []
          })
        }
        sellerMap.get(sellerId).products.push(product)
      }
    })
    return Array.from(sellerMap.values())
  }

  // Fetch real contact info for each unique seller
  useEffect(() => {
    const sellers = getSellers()
    const uniqueSellerIds = sellers.map(s => s.id).filter(id => id !== 'unknown')
    if (uniqueSellerIds.length === 0) return

    Promise.all(
      uniqueSellerIds.map(async (sellerId) => {
        try {
          const data = await sellerService.getStoreContactInfo(sellerId)
          return { sellerId, ...data }
        } catch {
          return { sellerId, contact_phone: null, contact_email: null }
        }
      })
    ).then(results => {
      const map: Record<string, { contact_phone: string | null; contact_email: string | null }> = {}
      results.forEach(r => { map[r.sellerId] = { contact_phone: r.contact_phone, contact_email: r.contact_email } })
      setSellerContacts(map)
    })
  }, [items])

  async function placeOrder() {
    if (items.length === 0) {
      setError('Your cart is empty. Please add products before placing an order.')
      return
    }
    
    // Validate shipping information
    if (!shippingInfo.fullName.trim()) {
      setError('Please enter your full name')
      return
    }
    if (!shippingInfo.phone.trim()) {
      setError('Please enter your phone number')
      return
    }
    if (!shippingInfo.address.trim()) {
      setError('Please enter your delivery address')
      return
    }
    if (!shippingInfo.city.trim()) {
      setError('Please enter your city')
      return
    }
    if (!shippingInfo.country.trim()) {
      setError('Please enter your country')
      return
    }
    
    // Validate EasyPaisa transaction ID
    if (paymentMethod === 'EASYPaisa' && !transactionId.trim()) {
      setError('Please enter your EasyPaisa Transaction ID')
      return
    }

    // Check for stock issues before syncing cart
  const outOfStock = items.find(item => item.product && typeof item.product.stock === 'number' && item.quantity > item.product.stock)
    if (outOfStock) {
      setError(`Insufficient stock for product: ${outOfStock.product.name}. Available: ${outOfStock.product.stock}`)
      return
    }
    setPlacing(true)
    setError(null)
    try {
      // Sync frontend cart to backend
      const cartPayload = items.map(item => ({
        productId: Number(item.product.id),
        quantity: item.quantity
      }))
      await orderService.syncCart(cartPayload)
      // Prepare extra payment info and shipping info
      let extra: any = {
        shipping_address: shippingInfo.address,
        shipping_city: shippingInfo.city,
        shipping_country: shippingInfo.country,
        shipping_postal_code: shippingInfo.postalCode,
        shipping_phone: shippingInfo.phone,
        shipping_full_name: shippingInfo.fullName,
      }
      if (paymentMethod === 'EASYPaisa') {
        extra.transactionId = transactionId
      }
      // Place order with shipping information
      const order = await orderService.checkout(cartPayload, paymentMethod, extra)
      setPlacedOrder(order)
      clearCart()
      setStage('success')
    } catch (err) {
      console.error('Checkout error:', err)
      let errorMsg = 'Checkout failed. Please try again.';
      if (err && typeof err === 'object') {
        if ('response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
          errorMsg = String(err.response.data.message);
        } else if ('message' in err && typeof err.message === 'string') {
          errorMsg = err.message;
        }
      }
      setError(errorMsg);
    } finally {
      setPlacing(false)
    }
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (items.length === 0 && stage === 'form') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <FiShoppingBag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <p className="text-xl font-semibold text-slate-700 mb-2">Your cart is empty</p>
        <p className="text-slate-500 mb-6">Add some products before checking out</p>
        <Button asChild><Link to="/products">Browse Products</Link></Button>
      </div>
    )
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (stage === 'success' && placedOrder) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 border-4 border-green-200">
          <FiCheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Placed!</h2>
        <p className="font-mono text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded inline-block mb-4">
          Order #{placedOrder.id}
        </p>
        <p className="text-slate-500 mb-8 text-sm">
          {paymentMethod === 'COD'
            ? 'Your order has been placed and sent to the seller for confirmation. The seller will contact you to arrange delivery. Pay in cash when it arrives.'
            : 'Your order has been placed and sent to the seller for confirmation. Please contact the seller via WhatsApp for payment details. Your order will be processed after payment verification.'}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/buyer/orders">View My Orders</Link>
          </Button>
          <Button className="flex-1" asChild>
            <Link to="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Checkout form ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Checkout</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Select your payment method and place your order</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Shipping Information & Payment Method */}
        <div className="lg:col-span-3 space-y-6">
          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <FiMapPin className="h-4 w-4 text-blue-600" />
                </div>
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={shippingInfo.fullName}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, fullName: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+923001234567"
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Main Street, Apt 4B"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, address: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Karachi"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, city: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="Pakistan"
                    value={shippingInfo.country}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, country: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    type="text"
                    placeholder="74000"
                    value={shippingInfo.postalCode}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seller Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                  <FiMessageCircle className="h-4 w-4 text-purple-600" />
                </div>
                Seller Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Contact sellers directly on WhatsApp for payment details and order confirmation
              </div>
              {getSellers().map((seller) => {
                const contact = sellerContacts[seller.id]
                const phone = contact?.contact_phone
                const waLink = phone
                  ? `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=Hi! I placed an order from your store. Please confirm.`
                  : null
                return (
                  <div key={seller.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{seller.name}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Products: {seller.products.length}</p>
                      </div>
                      {waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <FiPhone className="h-4 w-4" />
                          WhatsApp
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Contact via order confirmation</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                      {phone ? (
                        <p>📱 {phone}</p>
                      ) : (
                        <p className="italic">Phone not listed — seller will contact you after order</p>
                      )}
                      {paymentMethod === 'EASYPaisa' && phone && (
                        <p className="font-semibold text-green-700 mt-1">
                          💚 EasyPaisa / Bank: send to {phone} then enter your Transaction ID below
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700">
                    <p className="font-medium mb-1">Important:</p>
                    <ul className="space-y-0.5">
                      <li>• Contact seller for payment confirmation</li>
                      <li>• Order will be processed after seller approval</li>
                      <li>• Shipping arrangements made by seller</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                  <FiCreditCard className="h-4 w-4 text-green-600" />
                </div>
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {PAYMENT_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMethod(option.id)}
                  className={cn(
                    'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
                    paymentMethod === option.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{option.label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{option.desc}</p>
                  </div>
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center',
                    paymentMethod === option.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300 dark:border-slate-600'
                  )}>
                    {paymentMethod === option.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}

              {paymentMethod === 'EASYPaisa' && (
                <>
                  <div className="flex items-start gap-2 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                    <FiAlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      Send the total amount to the seller's EasyPaisa number shown above, then enter your Transaction ID below. The seller will verify your payment before shipping.
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Transaction ID <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-base bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                        placeholder="Enter EasyPaisa Transaction ID"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-20">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FiShoppingBag className="h-4 w-4 text-blue-600" />
                  Order Summary
                  <span className="ml-auto text-sm font-normal text-slate-500">{items.length} item(s)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map(({ product, quantity }) => (
                    product && product.id ? (
                      <div key={product.id} className="flex gap-3">
                        <div className="relative shrink-0">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-14 h-14 rounded-lg object-cover bg-slate-100 border border-slate-200"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200" />
                          )}
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                            {quantity}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">{product.name}</p>
                          <p className="text-xs text-blue-600 mt-0.5">{product.storeName}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-900 shrink-0">
                          {formatPrice(Number(product.price) * quantity)}
                        </span>
                      </div>
                    ) : null
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span>{serverTotalLoading ? '…' : formatPrice(total)}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900">Total</span>
                    {serverTotal !== null && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <FiShield className="h-3 w-3 text-green-600" />
                        <span className="text-[10px] text-green-700 font-medium">Server-verified price</span>
                      </div>
                    )}
                  </div>
                  {serverTotalLoading ? (
                    <FiLoader className="h-5 w-5 animate-spin text-blue-500" />
                  ) : (
                    <span className="text-xl font-bold text-blue-700">{formatPrice(total)}</span>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    <FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={placeOrder}
                  disabled={placing || items.length === 0}
                >
                  {placing ? (
                    <span className="flex items-center gap-2">
                      <FiLoader className="h-4 w-4 animate-spin" />
                      Placing Order…
                    </span>
                  ) : (
                    'Place Order'
                  )}
                </Button>

                <p className="text-xs text-center text-slate-400">
                  By placing an order you agree to our terms and the seller's payment arrangements.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
