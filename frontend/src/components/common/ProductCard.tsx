import { FiShoppingCart, FiHeart } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StarRating } from './StarRating'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const { user } = useAuth()
  const isBuyer = !user || user.role === 'buyer'
  // Defensive: Only calculate discount if originalPrice is a valid number > 0
  const discount = (typeof product.originalPrice === 'number' && product.originalPrice > 0)
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="relative overflow-hidden bg-slate-50 aspect-square">
        <Link to={`/products/${product.id}`}>
          <img
            src={product.images[0]}
            alt={typeof product.name === 'string' ? product.name : ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        {discount > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white border-0">
            -{discount}%
          </Badge>
        )}
        <button className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-red-500 transition-colors">
          <FiHeart className="h-4 w-4" />
        </button>
      </div>
      <CardContent className="p-4">
        <Link to={`/stores/${product.storeId}`} className="text-xs text-blue-600 hover:underline font-medium">
          {typeof product.storeName === 'string' ? product.storeName : ''}
        </Link>
        <Link to={`/products/${product.id}`}>
          <h3 className="mt-1 text-sm font-medium text-slate-800 line-clamp-2 hover:text-blue-600 transition-colors leading-snug">
            {typeof product.name === 'string' ? product.name : ''}
          </h3>
        </Link>
        <StarRating rating={product.rating} reviewCount={product.reviewCount} className="mt-2" />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-base font-bold text-slate-900">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-sm text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>
        {isBuyer ? (
          <Button
            size="sm"
            className="mt-3 w-full"
            onClick={() => addItem(product, 1)}
            disabled={product.stock === 0}
          >
            <FiShoppingCart className="h-4 w-4" />
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        ) : (
          <p className="mt-3 text-xs text-center text-slate-400">Only buyers can add to cart</p>
        )}
      </CardContent>
    </Card>
  )
}
