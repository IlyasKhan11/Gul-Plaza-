import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, MessageCircle, ChevronLeft, Package, Shield, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { StarRating } from '@/components/common/StarRating'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { mockProducts, mockReviews, mockStores } from '@/data/mockData'
import { formatPrice, formatDate } from '@/lib/utils'

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { isAuthenticated, user } = useAuth()
  const isBuyer = !user || user.role === 'buyer'
  const [selectedImage, setSelectedImage] = useState(0)
  const [qty, setQty] = useState(1)

  const product = mockProducts.find(p => p.id === id)
  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <p className="text-xl text-slate-400">Product not found</p>
      <Button className="mt-4" asChild><Link to="/products">Back to Products</Link></Button>
    </div>
  )

  const store = mockStores.find(s => s.id === product.storeId)
  const reviews = mockReviews.filter(r => r.productId === product.id)
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const whatsappMsg = encodeURIComponent(`Hi! I'm interested in "${product.name}" (Price: ${formatPrice(product.price)}). Can you give me more details?`)
  const whatsappUrl = store ? `https://wa.me/${store.whatsapp}?text=${whatsappMsg}` : '#'

  function handleAddToCart() {
    if (!product) return
    for (let i = 0; i < qty; i++) addItem(product)
    navigate('/cart')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-blue-600">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <span>/</span>
        <Link to="/products" className="hover:text-blue-600">Products</Link>
        <span>/</span>
        <span className="text-slate-700 truncate max-w-xs">{product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200">
            <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === idx ? 'border-blue-500' : 'border-slate-200 hover:border-slate-400'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <Link to={`/stores/${product.storeId}`} className="text-sm text-blue-600 hover:underline font-medium">
              {product.storeName}
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{product.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <StarRating rating={product.rating} reviewCount={product.reviewCount} size="md" />
              <Badge variant={product.stock > 0 ? 'success' : 'destructive'}>
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
              </Badge>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-900">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <>
                <span className="text-xl text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
                <Badge className="bg-red-500 border-0 text-white">-{discount}%</Badge>
              </>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <Label className="font-medium text-slate-700">Quantity:</Label>
            <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-2 hover:bg-red-50 hover:text-red-600 text-slate-700 font-bold transition-colors">−</button>
              <span className="px-5 py-2 text-sm font-bold text-slate-900 border-x-2 border-slate-200">{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="px-4 py-2 hover:bg-green-50 hover:text-green-600 text-slate-700 font-bold transition-colors">+</button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            {isBuyer ? (
              <Button size="lg" className="flex-1" onClick={handleAddToCart} disabled={product.stock === 0}>
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>
            ) : (
              <div className="flex-1 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">
                Only buyers can purchase products
              </div>
            )}
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-green-500 text-green-700 hover:bg-green-50"
              onClick={() => window.open(whatsappUrl, '_blank')}
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp Seller
            </Button>
          </div>

          {/* Trust icons */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-500">
            <div className="flex flex-col items-center gap-1">
              <Shield className="h-5 w-5 text-blue-600" />
              <span>Verified Seller</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Truck className="h-5 w-5 text-blue-600" />
              <span>Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Package className="h-5 w-5 text-blue-600" />
              <span>Easy Returns</span>
            </div>
          </div>

          {/* Store Card */}
          {store && (
            <div className="border border-slate-200 rounded-xl p-4 flex items-start gap-3 bg-slate-50/50 shadow-sm">
              <img src={store.logo} alt={store.name} className="w-12 h-12 rounded-lg border border-slate-200 object-cover" />
              <div className="flex-1">
                <Link to={`/stores/${store.id}`} className="font-semibold text-slate-900 hover:text-blue-600 text-sm">
                  {store.name}
                </Link>
                <StarRating rating={store.rating} reviewCount={store.reviewCount} className="mt-1" />
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{store.description}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/stores/${store.id}`}>Visit</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-slate-400 text-sm">No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={review.avatar} />
                    <AvatarFallback>{review.userName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{review.userName}</p>
                    <p className="text-xs text-slate-400">{formatDate(review.createdAt)}</p>
                  </div>
                </div>
                <StarRating rating={review.rating} size="sm" className="mb-2" />
                <p className="text-sm text-slate-700">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
        {!isAuthenticated && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-center">
            <p className="text-sm text-slate-700">
              <Link to="/login" className="text-blue-600 font-medium hover:underline">Login</Link> to write a review
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={`text-sm font-medium text-slate-700 ${className ?? ''}`}>{children}</span>
}
