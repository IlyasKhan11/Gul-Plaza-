import { FiShoppingCart, FiHeart } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StarRating } from './StarRating'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/utils'
import { wishlistService } from '@/services/wishlistService'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const { user } = useAuth()
  const isBuyer = !user || user.role === 'buyer'
  const [saved, setSaved] = useState(false)
  const [savingWishlist, setSavingWishlist] = useState(false)

  // Defensive: Ensure all values are properly typed
  const safePrice = typeof product.price === 'number' && product.price > 0 ? product.price : 0
  const safeOriginalPrice = typeof product.originalPrice === 'number' && product.originalPrice > 0 ? product.originalPrice : 0
  const safeStock = typeof product.stock === 'number' && product.stock >= 0 ? product.stock : 0
  const safeName = typeof product.name === 'string' ? product.name : ''
  const safeStoreName = typeof product.storeName === 'string' ? product.storeName : ''
  const safeImages = Array.isArray(product.images) && product.images.length > 0 ? product.images : []
  
  // Extract image URLs from both old string array and new object array formats
  const imageUrls = safeImages.map(img => {
    if (typeof img === 'string') return img
    if (typeof img === 'object' && img.image_url) return img.image_url
    return ''
  }).filter(Boolean)
  // Convert product.id to number for wishlist service
  const safeId = typeof product.id === 'string' ? parseInt(product.id, 10) : (typeof product.id === 'number' ? product.id : 0)

  // Defensive: Only calculate discount if originalPrice is a valid number > 0
  const discount = (safeOriginalPrice > 0)
    ? Math.round(((safeOriginalPrice - safePrice) / safeOriginalPrice) * 100)
    : 0

  useEffect(() => {
    if (!isBuyer || !user) return
    wishlistService.check(safeId).then(setSaved).catch(() => {})
  }, [safeId, isBuyer, user])

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    if (!user) return
    setSavingWishlist(true)
    try {
      if (saved) {
        await wishlistService.remove(safeId)
        setSaved(false)
      } else {
        await wishlistService.add(safeId)
        setSaved(true)
      }
    } catch {}
    finally { setSavingWishlist(false) }
  }

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="relative overflow-hidden bg-slate-50 aspect-square">
        <Link to={`/products/${product.id}`}>
          <img
            src={imageUrls[0] || product.primary_image || ''}
            alt={safeName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        {discount > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white border-0">
            -{discount}%
          </Badge>
        )}
        {isBuyer && (
          <button
            onClick={toggleWishlist}
            disabled={savingWishlist}
            className={`absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white transition-colors ${saved ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
          >
            <FiHeart className={`h-4 w-4 ${saved ? 'fill-red-500' : ''}`} />
          </button>
        )}
      </div>
      <CardContent className="p-4">
        <Link to={`/stores/${product.storeId}`} className="text-xs text-blue-600 hover:underline font-medium">
          {safeStoreName}
        </Link>
        <Link to={`/products/${product.id}`}>
          <h3 className="mt-1 text-sm font-medium text-slate-800 line-clamp-2 hover:text-blue-600 transition-colors leading-snug">
            {safeName}
          </h3>
        </Link>
        <StarRating rating={product.rating || 0} reviewCount={product.reviewCount || 0} className="mt-2" />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-base font-bold text-slate-900">{formatPrice(safePrice)}</span>
          {safeOriginalPrice > 0 && (
            <span className="text-sm text-slate-400 line-through">{formatPrice(safeOriginalPrice)}</span>
          )}
        </div>
        {isBuyer ? (
          <Button
            size="sm"
            className="mt-3 w-full"
            onClick={() => addItem(product, 1)}
            disabled={safeStock === 0}
          >
            <FiShoppingCart className="h-4 w-4" />
            {safeStock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        ) : (
          <p className="mt-3 text-xs text-center text-slate-400">Only buyers can add to cart</p>
        )}
      </CardContent>
    </Card>
  )
}
