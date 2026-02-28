import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, CheckCircle, ShoppingBag, MapPin, Phone, User, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { mockStores, mockOrders, mockTransactions } from '@/data/mockData'
import { formatPrice, generateId } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Order } from '@/types'

type PaymentMethod = 'whatsapp' | 'easypaisa' | 'jazzcash'

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: string; desc: string; account?: string }[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '💬',
    desc: 'Contact the seller directly on WhatsApp to confirm order and arrange payment.',
  },
  {
    id: 'easypaisa',
    label: 'EasyPaisa',
    icon: '🟢',
    desc: 'Send payment via EasyPaisa.',
    account: '0300-0000000',
  },
  {
    id: 'jazzcash',
    label: 'JazzCash',
    icon: '🔴',
    desc: 'Send payment via JazzCash.',
    account: '0321-0000000',
  },
]

export function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const { user } = useAuth()
  const [placed, setPlaced] = useState(false)
  const [placedOrderIds, setPlacedOrderIds] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('whatsapp')

  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
  })

  const shipping = total >= 2000 ? 0 : 200
  const grandTotal = total + shipping

  const sellers = [...new Set(items.map(i => i.product.sellerId))]
  const sellerItems = sellers.map(sellerId => ({
    store: mockStores.find(s => s.sellerId === sellerId),
    products: items.filter(i => i.product.sellerId === sellerId),
  }))

  function placeOrder() {
    if (!form.name || !form.phone || !form.address || !user) return

    const today = new Date().toISOString().split('T')[0]
    const newOrderIds: string[] = []

    // Create one order per seller
    sellerItems.forEach(({ store, products }) => {
      if (!store) return
      const orderId = generateId()
      const orderTotal = products.reduce((s, i) => s + i.product.price * i.quantity, 0)
      const COMMISSION_RATE = 0.05

      const newOrder: Order = {
        id: orderId,
        buyerId: user.id,
        buyerName: form.name,
        buyerPhone: form.phone,
        buyerAddress: form.address,
        sellerId: store.sellerId,
        storeName: store.name,
        items: products.map(i => ({ product: i.product, quantity: i.quantity, price: i.product.price })),
        total: orderTotal,
        status: 'pending',
        paymentMethod,
        createdAt: today,
        updatedAt: today,
      }
      mockOrders.push(newOrder)
      newOrderIds.push(orderId)

      // Create a pending transaction
      mockTransactions.push({
        id: generateId(),
        orderId,
        sellerId: store.sellerId,
        storeName: store.name,
        amount: orderTotal,
        commission: Math.round(orderTotal * COMMISSION_RATE),
        sellerShare: Math.round(orderTotal * (1 - COMMISSION_RATE)),
        status: 'pending',
        createdAt: today,
      })
    })

    setPlacedOrderIds(newOrderIds)
    setPlaced(true)
    clearCart()
  }

  if (placed) {
    const selectedPayment = PAYMENT_OPTIONS.find(p => p.id === paymentMethod)!

    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 border-4 border-green-200">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Placed Successfully!</h2>
        <p className="text-slate-500 mb-1 text-sm">
          {placedOrderIds.length > 1 ? `${placedOrderIds.length} orders created` : 'Order ID'}{': '}
          {placedOrderIds.map(id => (
            <span key={id} className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded mx-0.5">#{id}</span>
          ))}
        </p>

        <p className="text-slate-500 mt-3 mb-6 text-sm">
          {paymentMethod === 'whatsapp'
            ? 'Contact the seller on WhatsApp to confirm your order and arrange delivery.'
            : `Transfer the payment via ${selectedPayment.label} and share the screenshot with the seller on WhatsApp.`}
        </p>

        {/* Online payment instructions */}
        {paymentMethod !== 'whatsapp' && (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-sm space-y-2">
            <p className="font-semibold text-slate-800">{selectedPayment.label} Payment Details</p>
            <p className="text-slate-600">Account: <span className="font-mono font-bold">{selectedPayment.account}</span></p>
            <p className="text-slate-600">Amount: <span className="font-bold text-blue-700">{formatPrice(grandTotal)}</span></p>
            <p className="text-xs text-slate-400 mt-1">After sending payment, contact the seller on WhatsApp with your order ID and payment screenshot.</p>
          </div>
        )}

        {/* WhatsApp buttons */}
        <div className="space-y-3 mb-8">
          {sellerItems.map(({ store, products }) => {
            if (!store) return null
            const orderTotal = products.reduce((s, i) => s + i.product.price * i.quantity, 0)
            const itemsText = products.map(i => `${i.product.name} x${i.quantity} (${formatPrice(i.product.price * i.quantity)})`).join(', ')
            const msg = encodeURIComponent(
              `Hi! I placed an order on GUL PLAZA.\n\nItems: ${itemsText}\nTotal: ${formatPrice(orderTotal)}\nPayment: ${selectedPayment.label}\nName: ${form.name}\nPhone: ${form.phone}\nAddress: ${form.address}`
            )
            return (
              <Button
                key={store.id}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                onClick={() => window.open(`https://wa.me/${store.whatsapp}?text=${msg}`, '_blank')}
              >
                <MessageCircle className="h-5 w-5" />
                Contact {store.name} on WhatsApp
              </Button>
            )
          })}
        </div>

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

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <p className="text-xl font-semibold text-slate-700 mb-2">Your cart is empty</p>
        <p className="text-slate-500 mb-6">Add some products before checking out</p>
        <Button asChild><Link to="/products">Browse Products</Link></Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
        <p className="text-slate-500 mt-1">Complete your order details below</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Forms */}
        <div className="lg:col-span-3 space-y-5">
          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Full Name <span className="text-red-500">*</span>
                  </span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Phone Number <span className="text-red-500">*</span>
                  </span>
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+92 3XX XXXXXXX"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Delivery Address <span className="text-red-500">*</span>
                  </span>
                </Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="House #, Street, Area, City"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-green-600" />
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
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 mt-0.5',
                    paymentMethod === option.id ? 'bg-blue-100' : 'bg-slate-100'
                  )}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{option.label}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{option.desc}</p>
                    {option.account && paymentMethod === option.id && (
                      <p className="text-sm font-mono font-bold text-blue-700 mt-1">
                        Account: {option.account}
                      </p>
                    )}
                  </div>
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center',
                    paymentMethod === option.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  )}>
                    {paymentMethod === option.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-20">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                  Order Summary
                  <span className="ml-auto text-sm font-normal text-slate-500">{items.length} item(s)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-14 h-14 rounded-lg object-cover bg-slate-100 border border-slate-200"
                        />
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                          {quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">{product.name}</p>
                        <p className="text-xs text-blue-600 mt-0.5">{product.storeName}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900 shrink-0">{formatPrice(product.price * quantity)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Shipping</span>
                    <span className={shipping === 0 ? 'text-green-600 font-medium' : 'text-slate-700'}>
                      {shipping === 0 ? '🎉 Free' : formatPrice(shipping)}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-blue-700">{formatPrice(grandTotal)}</span>
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={placeOrder}
                  disabled={!form.name || !form.phone || !form.address}
                >
                  Place Order
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
