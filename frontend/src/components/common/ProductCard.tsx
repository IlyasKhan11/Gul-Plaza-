import { FiShoppingCart, FiHeart, FiEye } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
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

  const safePrice = typeof product.price === 'number' && product.price > 0 ? product.price : 0
  const safeOriginalPrice = typeof product.originalPrice === 'number' && product.originalPrice > 0 ? product.originalPrice : 0
  const safeStock = typeof product.stock === 'number' && product.stock >= 0 ? product.stock : 0
  const safeName = typeof product.name === 'string' ? product.name : ''
  const safeStoreName = typeof product.storeName === 'string' ? product.storeName : ''
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
    <div className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col
      border border-slate-100 dark:border-slate-800
      hover:border-blue-200 dark:hover:border-blue-800
      shadow-sm hover:shadow-2xl dark:hover:shadow-blue-950/40
      transition-all duration-300">

      {/* ── Image ── */}
      <div className="relative overflow-hidden bg-slate-50 dark:bg-slate-800" style={{ aspectRatio: '4/3' }}>
        <Link to={`/products/${product.id}`}>
          <img
            src={imageUrls[0] || product.primary_image || ''}
            alt={safeName}
            className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-500 ease-out"
          />
        </Link>

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Badges — top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-red-500 text-white text-[11px] font-bold shadow-md">
              -{discount}%
            </span>
          )}
          {safeStock === 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800/80 backdrop-blur-sm text-white text-[11px] font-semibold">
              Sold Out
            </span>
          )}
        </div>

        {/* Action buttons — top right */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {isBuyer && (
            <button
              onClick={toggleWishlist}
              disabled={savingWishlist}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-200 ${
                saved
                  ? 'bg-red-500 text-white scale-105'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-500 hover:text-red-500 hover:scale-105'
              }`}
            >
              <FiHeart className={`h-4 w-4 ${saved ? 'fill-white' : ''}`} />
            </button>
          )}
          <Link
            to={`/products/${product.id}`}
            className="w-9 h-9 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-500 hover:text-blue-600 flex items-center justify-center shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
          >
            <FiEye className="h-4 w-4" />
          </Link>
        </div>

      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 p-4">
        {/* Store name */}
        {safeStoreName ? (
          <Link
            to={`/stores/${product.storeId}`}
            className="text-[10px] font-bold text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 uppercase tracking-widest truncate transition-colors"
          >
            {safeStoreName}
          </Link>
        ) : <div className="h-3.5" />}

        {/* Product name */}
        <Link to={`/products/${product.id}`}>
          <h3 className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-snug min-h-[2.5rem]">
            {safeName}
          </h3>
        </Link>

        {/* Rating */}
        <StarRating rating={product.rating || 0} reviewCount={product.reviewCount || 0} className="mt-2" />

        {/* Price row */}
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatPrice(safePrice)}
          </span>
          {safeOriginalPrice > 0 && (
            <span className="text-xs text-slate-400 line-through">{formatPrice(safeOriginalPrice)}</span>
          )}
        </div>

        {/* CTA — shown when NOT hovering (hover shows overlay button above) */}
        <div className="mt-auto pt-3">
          {isBuyer ? (
            safeStock === 0 ? (
              <div className="w-full h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-400">
                Out of Stock
              </div>
            ) : (
              <button
                onClick={() => addItem(product, 1)}
                className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <FiShoppingCart className="h-3.5 w-3.5" />
                Add to Cart
              </button>
            )
          ) : (
            <p className="text-[11px] text-center text-slate-400 dark:text-slate-600">Only buyers can add to cart</p>
          )}
        </div>
      </div>
    </div>
  )
}
