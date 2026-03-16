import { FiShoppingCart, FiHeart } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
  const navigate = useNavigate()
  const isBuyer = !user || user.role === 'buyer'
  const [saved, setSaved] = useState(false)
  const [savingWishlist, setSavingWishlist] = useState(false)

  const safePrice = typeof product.price === 'number' && product.price > 0 ? product.price : 0
  const safeOriginalPrice = typeof product.originalPrice === 'number' && product.originalPrice > 0 ? product.originalPrice : 0
  const safeStock = typeof product.stock === 'number' && product.stock >= 0 ? product.stock : 0
  const safeName = typeof product.name === 'string' ? product.name : ''
  const safeImages = Array.isArray(product.images) && product.images.length > 0 ? product.images : []

  const imageUrls = safeImages.map(img => {
    if (typeof img === 'string') return img
    if (typeof img === 'object' && img.image_url) return img.image_url
    return ''
  }).filter(Boolean)

  const safeId = typeof product.id === 'string' ? parseInt(product.id, 10) : (typeof product.id === 'number' ? product.id : 0)

  const discount = safeOriginalPrice > 0
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
      if (saved) { await wishlistService.remove(safeId); setSaved(false) }
      else { await wishlistService.add(safeId); setSaved(true) }
    } catch {}
    finally { setSavingWishlist(false) }
  }

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col
      shadow-sm hover:shadow-lg transition-all duration-300">

      {/* ── Image ── */}
      <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ aspectRatio: '1/1' }}>
        <Link to={`/products/${product.id}`}>
          <img
            src={imageUrls[0] || product.primary_image || ''}
            alt={safeName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400 ease-out"
          />
        </Link>

        {/* Category badge — top left */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {product.category && (
            <span className="px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wide">
              {product.category}
            </span>
          )}
          {discount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold">
              -{discount}%
            </span>
          )}
          {safeStock === 0 && (
            <span className="px-2 py-0.5 rounded-md bg-slate-700/80 backdrop-blur-sm text-white text-[10px] font-bold">
              Sold Out
            </span>
          )}
        </div>

        {/* Wishlist — top right */}
        {isBuyer && (
          <button
            onClick={toggleWishlist}
            disabled={savingWishlist}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
              saved
                ? 'bg-red-500 text-white'
                : 'bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-red-500'
            }`}
          >
            <FiHeart className={`h-3.5 w-3.5 ${saved ? 'fill-white' : ''}`} />
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="p-4 flex flex-col gap-1.5">
        {/* Product name */}
        <Link to={`/products/${product.id}`}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 hover:text-orange-500 transition-colors leading-snug">
            {safeName}
          </h3>
        </Link>

        {/* Rating + sold */}
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="text-amber-400">★</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{product.rating?.toFixed(1) || '0.0'}</span>
          <span className="text-slate-400">{product.reviewCount || 0} sold</span>
        </div>

        {/* Price row + cart button */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex flex-col">
            <span className="text-lg font-extrabold text-orange-500 tracking-tight">
              {formatPrice(safePrice)}
            </span>
            {safeOriginalPrice > 0 && (
              <span className="text-xs text-slate-400 line-through">{formatPrice(safeOriginalPrice)}</span>
            )}
          </div>

          {/* Cart button */}
          {safeStock === 0 ? (
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <FiShoppingCart className="h-4 w-4 text-slate-400" />
            </div>
          ) : (
            <button
              onClick={() => {
                if (!user) { navigate('/login'); return }
                addItem(product, 1)
              }}
              className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110"
            >
              <FiShoppingCart className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
