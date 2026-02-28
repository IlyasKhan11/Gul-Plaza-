import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/utils'

export function CartPage() {
  const { items, removeItem, updateQuantity, total, itemCount } = useCart()
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  if (user && user.role !== 'buyer') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <ShoppingBag className="h-10 w-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Not available</h2>
        <p className="text-slate-500 mb-7">The shopping cart is only available for buyer accounts.</p>
        <Button size="lg" onClick={() => navigate(user.role === 'admin' ? '/admin/dashboard' : '/seller/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <ShoppingBag className="h-10 w-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-7">Looks like you haven't added anything to your cart yet.</p>
        <Button size="lg" asChild>
          <Link to="/products">Browse Products</Link>
        </Button>
      </div>
    )
  }

  const shipping = total >= 2000 ? 0 : 200
  const grandTotal = total + shipping

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shopping Cart</h1>
          <p className="text-slate-500 text-sm">{itemCount} item{itemCount !== 1 ? 's' : ''} in your cart</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-3 space-y-3">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
              <Link to={`/products/${product.id}`} className="shrink-0">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover bg-slate-100 border border-slate-100"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${product.id}`}>
                  <h3 className="font-semibold text-slate-800 text-sm hover:text-blue-600 transition-colors line-clamp-2 leading-snug">{product.name}</h3>
                </Link>
                <p className="text-xs text-blue-600 font-medium mt-1">{product.storeName}</p>
                <p className="text-xs text-slate-400 mt-0.5">Unit price: {formatPrice(product.price)}</p>

                <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                  {/* Quantity control */}
                  <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-red-50 hover:text-red-600 text-slate-600 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm font-bold text-slate-900">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      disabled={quantity >= product.stock}
                      className="w-8 h-8 flex items-center justify-center hover:bg-green-50 hover:text-green-600 text-slate-600 transition-colors disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-base">{formatPrice(product.price * quantity)}</span>
                    <button
                      onClick={() => removeItem(product.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Link to="/products" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-1">
            ← Continue Shopping
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-600" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                    <span className="font-medium text-slate-800">{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Shipping</span>
                    <span className={shipping === 0 ? 'text-green-600 font-semibold' : 'text-slate-800 font-medium'}>
                      {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                    </span>
                  </div>
                </div>

                {shipping === 0 && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-xs text-green-700 font-medium">
                    🎉 You qualify for free shipping!
                  </div>
                )}
                {shipping > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700">
                    Add {formatPrice(2000 - total)} more for free shipping
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-bold text-blue-700">{formatPrice(grandTotal)}</span>
                </div>

                {isAuthenticated ? (
                  <Button className="w-full h-12 text-base font-semibold gap-2" onClick={() => navigate('/checkout')}>
                    Proceed to Checkout <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button className="w-full h-12 text-base gap-2" asChild>
                      <Link to="/login">Login to Checkout <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                    <p className="text-xs text-center text-slate-400">
                      New here?{' '}
                      <Link to="/register" className="text-blue-600 hover:underline font-medium">Create a free account</Link>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {['Secure Checkout', 'Easy Returns', 'COD Available'].map(t => (
                    <div key={t} className="text-center text-xs text-slate-400 bg-slate-50 rounded-lg py-2 px-1">✓ {t}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
