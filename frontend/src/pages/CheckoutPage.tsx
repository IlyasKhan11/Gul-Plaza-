import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiCheckCircle, FiShoppingBag,
  FiCreditCard, FiAlertCircle, FiLoader,
} from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/context/CartContext'
import { orderService, type CheckoutPaymentMethod, type CreatedOrder } from '@/services/orderService'
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
    id: 'BANK_TRANSFER',
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

  const shipping = total >= 2000 ? 0 : 200
  const grandTotal = total + shipping

  async function placeOrder() {
    if (items.length === 0) return
    setPlacing(true)
    setError(null)
    try {
      const order = await orderService.checkout(items, paymentMethod)
      setPlacedOrder(order)
      clearCart()
      setStage('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order. Please try again.')
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
            ? 'Your order has been placed. The seller will confirm and arrange delivery. Pay in cash when it arrives.'
            : 'Your order is awaiting payment verification. Contact the seller via their store page to get their Easypaisa number or bank details, then share proof of payment.'}
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
        <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
        <p className="text-slate-500 mt-1">Select your payment method and place your order</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Payment Method */}
        <div className="lg:col-span-3">
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
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{option.label}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{option.desc}</p>
                  </div>
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center',
                    paymentMethod === option.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  )}>
                    {paymentMethod === option.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}

              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="flex items-start gap-2 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                  <FiAlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    After placing your order, contact the seller for their Easypaisa number or bank account details.
                    Admin will verify your payment before the order is processed.
                  </span>
                </div>
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
                    <div key={product.id} className="flex gap-3">
                      <div className="relative shrink-0">
                        {product.images[0] ? (
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
                        {formatPrice(product.price * quantity)}
                      </span>
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
                      {shipping === 0 ? 'Free' : formatPrice(shipping)}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-blue-700">{formatPrice(grandTotal)}</span>
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
