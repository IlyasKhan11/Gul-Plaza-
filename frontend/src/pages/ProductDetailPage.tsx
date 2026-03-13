import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiMessageCircle, FiChevronLeft, FiPackage, FiShield, FiTruck, FiZap, FiFlag, FiHeart, FiChevronRight, FiStar } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { ratingService, type ProductRatingSummary } from '@/services/ratingService'
import { wishlistService } from '@/services/wishlistService'
import type { Product } from '@/types'
import { formatPrice } from '@/lib/utils'

const REPORT_REASONS = [
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'fake_product', label: 'Fake Product' },
  { value: 'misleading_description', label: 'Misleading Description' },
  { value: 'spam', label: 'Spam' },
  { value: 'copyright_violation', label: 'Copyright Violation' },
  { value: 'other', label: 'Other' },
]

interface ApiProduct extends Product {
  store_name?: string;
  store_description?: string;
  store_id?: string;
  category_name?: string;
  images?: any;
}

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { isAuthenticated, user } = useAuth()
  const isBuyer = !user || user.role === 'buyer'
  const [selectedImage, setSelectedImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(undefined)

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState(false)

  const [saved, setSaved] = useState(false)
  const [savingWishlist, setSavingWishlist] = useState(false)

  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratingSummary, setRatingSummary] = useState<ProductRatingSummary | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<{ success: boolean; data: Product }>(`/api/products/${id}`)
      .then(res => { setProduct(res.data); setError(null) })
      .catch(err => { setError(err.message || 'Failed to load product'); setProduct(null) })
      .finally(() => setLoading(false))

    ratingService.getProductRatings(Number(id))
      .then(data => { setRatingSummary(data.summary) })
      .catch(() => {})

    if (user?.role === 'buyer') {
      wishlistService.check(Number(id)).then(setSaved).catch(() => {})
    }
  }, [id, user])

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportReason) { setReportError('Please select a reason'); return }
    if (reportDesc && reportDesc.length < 10) { setReportError('Description must be at least 10 characters'); return }
    setReportSubmitting(true)
    setReportError(null)
    try {
      await api.post('/api/reports', {
        product_id: Number(id),
        reason: reportReason,
        ...(reportDesc ? { description: reportDesc } : {}),
      })
      setReportSuccess(true)
    } catch (err: any) {
      setReportError(err.message || 'Failed to submit report')
    } finally {
      setReportSubmitting(false)
    }
  }

  const selectedVariant = product?.variants?.find(v => v.id === selectedVariantId)

  const handleAddToCart = () => {
    if (!product) return
    const label = selectedVariant ? selectedVariant.options.map(o => o.value).join(' / ') : undefined
    addItem(product, qty, selectedVariantId, label)
    navigate('/cart')
  }

  const handleBuyNow = () => {
    if (!product) return
    const label = selectedVariant ? selectedVariant.options.map(o => o.value).join(' / ') : undefined
    addItem(product, qty, selectedVariantId, label)
    navigate('/checkout')
  }

  const handleToggleWishlist = async () => {
    if (savingWishlist) return
    setSavingWishlist(true)
    try {
      if (saved) { await wishlistService.remove(Number(id)); setSaved(false) }
      else { await wishlistService.add(Number(id)); setSaved(true) }
    } catch {} finally { setSavingWishlist(false) }
  }

  const openReport = () => {
    setReportReason(''); setReportDesc(''); setReportError(null); setReportSuccess(false); setReportOpen(true)
  }

  const getImageUrl = (image: any): string => {
    if (!image) return '/placeholder.png'
    if (typeof image === 'string') return image
    if (image.image_url) {
      const url = image.image_url.startsWith('/') ? image.image_url : `/${image.image_url}`
      return url
    }
    return '/placeholder.png'
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading product...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <FiPackage className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">Product not found</p>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/products">Back to Products</Link>
          </Button>
        </div>
      </div>
    )
  }

  const whatsappUrl = '#'
  const storeName = product.store_name || product.storeName || 'Unknown Store'
  const storeId = product.store_id || product.storeId
  const storeDescription = product.store_description || ''
  const stockToUse = selectedVariant ? selectedVariant.stock : (product.stock ?? 0)
  const currentPrice = selectedVariant ? selectedVariant.price : Number(product.price)

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-blue-500 transition-colors">
            <FiChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
          <FiChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-blue-500 transition-colors">Products</Link>
          <FiChevronRight className="h-3 w-3" />
          <span className="text-slate-600 dark:text-slate-300 truncate max-w-[200px] font-medium">
            {product.title || product.name}
          </span>
        </nav>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="grid md:grid-cols-[420px_1fr] lg:grid-cols-[460px_1fr]">

            {/* ── Left: Images ── */}
            <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
              {/* Main image */}
              <div className="relative rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800" style={{ height: '340px' }}>
                <img
                  src={product.images?.length ? getImageUrl(product.images[selectedImage]) : '/placeholder.png'}
                  alt={product.title || product.name}
                  className="w-full h-full object-contain p-3"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
                />
                {/* Wishlist on image */}
                {user?.role === 'buyer' && (
                  <button
                    onClick={handleToggleWishlist}
                    disabled={savingWishlist}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-all ${
                      saved ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-400 hover:text-red-500'
                    }`}
                  >
                    <FiHeart className={`h-4 w-4 ${saved ? 'fill-white' : ''}`} />
                  </button>
                )}
              </div>

              {/* Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {product.images.map((img: any, idx: number) => (
                    <button
                      key={img.id || idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                        selectedImage === idx
                          ? 'border-blue-500 scale-105'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={getImageUrl(img)}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust badges row */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { icon: FiShield, label: 'Verified Seller', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/50' },
                  { icon: FiTruck,  label: 'Fast Delivery',   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
                  { icon: FiPackage, label: 'Easy Returns',   color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-950/50' },
                ].map(({ icon: Icon, label, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-2.5 flex flex-col items-center gap-1.5 text-center`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Details ── */}
            <div className="p-6 flex flex-col gap-5">

              {/* Title + badges */}
              <div>
                {product.category_name && (
                  <span className="text-[11px] font-bold text-blue-500 uppercase tracking-widest">{product.category_name}</span>
                )}
                <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                  {product.title || product.name}
                </h1>
                <div className="flex items-center gap-2.5 mt-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <FiStar key={i} className={`h-3.5 w-3.5 ${i <= Math.round(ratingSummary?.average_rating || product.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                    ))}
                    <span className="text-xs text-slate-500 ml-1">
                      {(ratingSummary?.average_rating || product.rating || 0).toFixed(1)}
                      {(ratingSummary?.total_reviews || 0) > 0 && ` (${ratingSummary?.total_reviews})`}
                    </span>
                  </div>
                  <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    stockToUse > 0
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                  }`}>
                    {stockToUse > 0 ? `In Stock (${stockToUse})` : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {formatPrice(currentPrice)}
                </span>
                {product.originalPrice && product.originalPrice > currentPrice && (
                  <>
                    <span className="text-sm text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
                    <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full">
                      -{Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)}%
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Description</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (() => {
                const colorMap: Record<string, number[]> = {}
                const sizeMap: Record<string, number[]> = {}
                for (const v of product.variants) {
                  for (const o of v.options) {
                    if (o.type === 'color') { if (!colorMap[o.value]) colorMap[o.value] = []; colorMap[o.value].push(v.id) }
                    else if (o.type === 'size') { if (!sizeMap[o.value]) sizeMap[o.value] = []; sizeMap[o.value].push(v.id) }
                  }
                }
                const colors = Object.keys(colorMap)
                const sizes = Object.keys(sizeMap)
                return (
                  <div className="space-y-3">
                    {colors.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Color</p>
                        <div className="flex flex-wrap gap-2">
                          {colors.map(color => {
                            const vId = colorMap[color][0]
                            const isSelected = selectedVariantId === vId
                            return (
                              <button key={color} onClick={() => setSelectedVariantId(isSelected ? undefined : vId)}
                                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                                  isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-700 dark:text-slate-300'
                                }`}>{color}</button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {sizes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Size</p>
                        <div className="flex flex-wrap gap-2">
                          {sizes.map(size => {
                            const vId = sizeMap[size][0]
                            const isSelected = selectedVariantId === vId
                            const outOfStock = product.variants?.find(v => v.id === vId)?.stock === 0
                            return (
                              <button key={size} disabled={!!outOfStock} onClick={() => setSelectedVariantId(isSelected ? undefined : vId)}
                                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                  isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-700 dark:text-slate-300'
                                }`}>{size}</button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Quantity */}
              <div className="flex items-center gap-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Qty</p>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={stockToUse === 0}
                    className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40 font-bold text-lg"
                  >−</button>
                  <span className="w-10 text-center text-sm font-bold text-slate-900 dark:text-white">{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(stockToUse, q + 1))}
                    disabled={stockToUse === 0 || qty >= stockToUse}
                    className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors disabled:opacity-40 font-bold text-lg"
                  >+</button>
                </div>
                {selectedVariant && <span className="text-xs text-slate-400">{selectedVariant.stock} available</span>}
              </div>

              {/* Action buttons */}
              {isBuyer ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={handleAddToCart}
                      disabled={stockToUse === 0}
                      className="h-11 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <FiShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </button>
                    <button
                      onClick={handleBuyNow}
                      disabled={stockToUse === 0}
                      className="h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <FiZap className="h-4 w-4" />
                      Buy Now
                    </button>
                  </div>
                  <button
                    onClick={() => window.open(whatsappUrl, '_blank')}
                    className="w-full h-11 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <FiMessageCircle className="h-4 w-4" />
                    WhatsApp Seller
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-medium">
                    Only buyers can purchase products
                  </div>
                  <button
                    onClick={() => window.open(whatsappUrl, '_blank')}
                    className="w-full h-11 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <FiMessageCircle className="h-4 w-4" />
                    WhatsApp Seller
                  </button>
                </div>
              )}

              {/* Store card */}
              {storeId && (
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {storeName?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/stores/${storeId}`} className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {storeName}
                    </Link>
                    {storeDescription && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{storeDescription}</p>
                    )}
                  </div>
                  <Link to={`/stores/${storeId}`} className="text-xs text-blue-500 hover:text-blue-700 font-semibold whitespace-nowrap">
                    Visit →
                  </Link>
                </div>
              )}

              {/* Report */}
              <div className="flex justify-end pt-1">
                {isAuthenticated && user?.role === 'buyer' ? (
                  <button onClick={openReport} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                    <FiFlag className="h-3 w-3" /> Report product
                  </button>
                ) : !isAuthenticated ? (
                  <Link to="/login" className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors">
                    <FiFlag className="h-3 w-3" /> Login to report
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Customer Reviews</h2>
          {ratingSummary && ratingSummary.total_reviews > 0 ? (
            <div className="text-sm text-slate-500">Reviews coming soon.</div>
          ) : (
            <p className="text-sm text-slate-400">No reviews yet. Be the first to review!</p>
          )}
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Product</DialogTitle>
            <DialogDescription>Help us keep the marketplace safe. Your report will be reviewed by our team.</DialogDescription>
          </DialogHeader>
          {reportSuccess ? (
            <div className="py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <FiFlag className="h-5 w-5 text-green-600" />
              </div>
              <p className="font-medium text-slate-800">Report Submitted</p>
              <p className="text-sm text-slate-500 mt-1">Thank you. Our team will review this report.</p>
              <Button className="mt-4" onClick={() => setReportOpen(false)}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleReportSubmit} className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Reason *</label>
                <Select value={reportReason} onValueChange={setReportReason}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a reason" /></SelectTrigger>
                  <SelectContent>
                    {REPORT_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Additional Details (optional)</label>
                <textarea
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              {reportError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{reportError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={reportSubmitting}>
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
