import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiMessageCircle, FiChevronLeft, FiPackage, FiShield, FiTruck, FiZap, FiFlag, FiHeart } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarRating } from '@/components/common/StarRating'
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

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={`text-sm font-medium text-slate-700 ${className ?? ''}`}>{children}</span>
}

// Extend the Product type to include API response fields
// Use any for images to handle both string[] and object[] formats from API
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

  // Report dialog state
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState(false)

  // Wishlist state
  const [saved, setSaved] = useState(false)
  const [savingWishlist, setSavingWishlist] = useState(false)

  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratingSummary, setRatingSummary] = useState<ProductRatingSummary | null>(null)

  // Fetch product and ratings
  useEffect(() => {
    if (!id) return
    setLoading(true)
    
    // Fetch product - the API returns { success, message, data: product }
    api.get<{ success: boolean; data: Product }>(`/api/products/${id}`)
      .then(res => {
        setProduct(res.data) // res.data is the product
        setError(null)
      })
      .catch(err => {
        setError(err.message || 'Failed to load product')
        setProduct(null)
      })
      .finally(() => setLoading(false))
    
    // Fetch ratings
    ratingService.getProductRatings(Number(id))
      .then(data => { setRatingSummary(data.summary) })
      .catch(() => {})

    // Check wishlist status for buyers
    if (user?.role === 'buyer') {
      wishlistService.check(Number(id))
        .then(setSaved)
        .catch(() => {})
    }
  }, [id, user])

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportReason) { 
      setReportError('Please select a reason'); 
      return 
    }
    if (reportDesc && reportDesc.length < 10) { 
      setReportError('Description must be at least 10 characters'); 
      return 
    }
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
    const label = selectedVariant
      ? selectedVariant.options.map(o => o.value).join(' / ')
      : undefined
    addItem(product, qty, selectedVariantId, label)
    navigate('/cart')
  }

  const handleBuyNow = () => {
    if (!product) return
    const label = selectedVariant
      ? selectedVariant.options.map(o => o.value).join(' / ')
      : undefined
    addItem(product, qty, selectedVariantId, label)
    navigate('/checkout')
  }

  const handleToggleWishlist = async () => {
    if (savingWishlist) return
    setSavingWishlist(true)
    try {
      if (saved) {
        await wishlistService.remove(Number(id))
        setSaved(false)
      } else {
        await wishlistService.add(Number(id))
        setSaved(true)
      }
    } catch {
      // silently fail
    } finally {
      setSavingWishlist(false)
    }
  }

  const openReport = () => {
    setReportReason('')
    setReportDesc('')
    setReportError(null)
    setReportSuccess(false)
    setReportOpen(true)
  }

  // Get the image URL - FIXED: Handle API image structure
  const getImageUrl = (image: any): string => {
    if (!image) return '/placeholder.png'
    if (typeof image === 'string') return image
    if (image.image_url) {
      // If it's a relative path, make sure it starts with /
      const url = image.image_url.startsWith('/') ? image.image_url : `/${image.image_url}`
      return url
    }
    return '/placeholder.png'
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-xl text-slate-400">Loading product...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-xl text-slate-400">Product not found</p>
        <Button className="mt-4" asChild>
          <Link to="/products">Back to Products</Link>
        </Button>
      </div>
    )
  }

  const whatsappUrl = '#'

  // FIXED: Use the correct store info from API
  const storeName = product.store_name || product.storeName || 'Unknown Store'
  const storeId = product.store_id || product.storeId
  const storeDescription = product.store_description || ''

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-blue-600">
          <FiChevronLeft className="h-4 w-4" /> Back
        </button>
        <span>/</span>
        <Link to="/products" className="hover:text-blue-600">Products</Link>
        <span>/</span>
        <span className="text-slate-700 truncate max-w-xs">{product.title || product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images - FIXED: Handle API image structure */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200">
            <img 
              src={product.images?.length ? getImageUrl(product.images[selectedImage]) : '/placeholder.png'}
              alt={product.title || product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.png'
              }}
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img: any, idx: number) => (
                <button
                  key={img.id || idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors ${
                    selectedImage === idx ? 'border-blue-500' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img 
                    src={getImageUrl(img)} 
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.png'
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{product.title || product.name}</h1>
            {user?.role === 'buyer' && (
              <button
                onClick={handleToggleWishlist}
                disabled={savingWishlist}
                title={saved ? 'Remove from saved' : 'Save product'}
                className={`shrink-0 p-2 rounded-full border transition-colors ${
                  saved
                    ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-red-400 hover:border-red-200'
                }`}
              >
                <FiHeart className={`h-5 w-5 ${saved ? 'fill-red-500' : ''}`} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2">
            <StarRating 
              rating={ratingSummary?.average_rating || product.rating || 0} 
              reviewCount={ratingSummary?.total_reviews || product.reviewCount || 0} 
              size="md" 
            />
            <Badge variant={(product.stock || 0) > 0 ? 'success' : 'destructive'}>
              {(product.stock || 0) > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
            </Badge>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-900">
              {formatPrice(selectedVariant ? selectedVariant.price : Number(product.price))}
            </span>
          </div>

          <Separator />

          {/* Variant selector */}
          {product.variants && product.variants.length > 0 && (() => {
            // Group options by type across all variants
            const colorMap: Record<string, number[]> = {}
            const sizeMap: Record<string, number[]> = {}
            for (const v of product.variants) {
              for (const o of v.options) {
                if (o.type === 'color') {
                  if (!colorMap[o.value]) colorMap[o.value] = []
                  colorMap[o.value].push(v.id)
                } else if (o.type === 'size') {
                  if (!sizeMap[o.value]) sizeMap[o.value] = []
                  sizeMap[o.value].push(v.id)
                }
              }
            }
            const colors = Object.keys(colorMap)
            const sizes = Object.keys(sizeMap)
            return (
              <div className="space-y-3">
                {colors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Color</p>
                    <div className="flex flex-wrap gap-2">
                      {colors.map(color => {
                        const vId = colorMap[color][0]
                        const isSelected = selectedVariantId === vId
                        return (
                          <button
                            key={color}
                            onClick={() => setSelectedVariantId(isSelected ? undefined : vId)}
                            className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 hover:border-slate-400 text-slate-700'
                            }`}
                          >
                            {color}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Size</p>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(size => {
                        const vId = sizeMap[size][0]
                        const isSelected = selectedVariantId === vId
                        const variant = product.variants?.find(v => v.id === vId)
                        const outOfStock = variant && variant.stock === 0
                        return (
                          <button
                            key={size}
                            disabled={!!outOfStock}
                            onClick={() => setSelectedVariantId(isSelected ? undefined : vId)}
                            className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 hover:border-slate-400 text-slate-700'
                            }`}
                          >
                            {size}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>
          </div>

          {/* Quantity */}
          {(() => {
            const stockToUse = selectedVariant ? selectedVariant.stock : (product.stock ?? 0)
            return (
              <div className="flex items-center gap-3">
                <Label className="font-medium text-slate-700">Quantity:</Label>
                <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-4 py-2 hover:bg-red-50 hover:text-red-600 text-slate-700 font-bold transition-colors"
                    disabled={stockToUse === 0}
                  >
                    −
                  </button>
                  <span className="px-5 py-2 text-sm font-bold text-slate-900 border-x-2 border-slate-200">{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(stockToUse, q + 1))}
                    className="px-4 py-2 hover:bg-green-50 hover:text-green-600 text-slate-700 font-bold transition-colors"
                    disabled={stockToUse === 0 || qty >= stockToUse}
                  >
                    +
                  </button>
                </div>
                {selectedVariant && (
                  <span className="text-xs text-slate-400">{selectedVariant.stock} in stock</span>
                )}
              </div>
            )
          })()}

          {/* Actions */}
          {isBuyer ? (
            <div className="space-y-2">
              <div className="flex gap-3 flex-wrap">
                <Button size="lg" className="flex-1" onClick={handleAddToCart} disabled={product.stock === 0}>
                  <FiShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
                <Button 
                  size="lg" 
                  variant="default" 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  onClick={handleBuyNow} 
                  disabled={product.stock === 0}
                >
                  <FiZap className="h-5 w-5 mr-2" />
                  Buy Now
                </Button>
              </div>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-green-500 text-green-700 hover:bg-green-50"
                onClick={() => window.open(whatsappUrl, '_blank')}
              >
                <FiMessageCircle className="h-5 w-5 mr-2" />
                WhatsApp Seller
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">
                Only buyers can purchase products
              </div>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-green-500 text-green-700 hover:bg-green-50"
                onClick={() => window.open(whatsappUrl, '_blank')}
              >
                <FiMessageCircle className="h-5 w-5 mr-2" />
                WhatsApp Seller
              </Button>
            </div>
          )}

          {/* Report link */}
          <div className="flex items-center justify-end pt-1">
            {isAuthenticated && user?.role === 'buyer' ? (
              <button
                onClick={openReport}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                <FiFlag className="h-3 w-3" />
                Report this product
              </button>
            ) : !isAuthenticated ? (
              <Link to="/login" className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors">
                <FiFlag className="h-3 w-3" />
                Login to report this product
              </Link>
            ) : null}
          </div>

          {/* Trust icons */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-500">
            <div className="flex flex-col items-center gap-1">
              <FiShield className="h-5 w-5 text-blue-600" />
              <span>Verified Seller</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FiTruck className="h-5 w-5 text-blue-600" />
              <span>Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FiPackage className="h-5 w-5 text-blue-600" />
              <span>Easy Returns</span>
            </div>
          </div>

          {/* Store Card - FIXED: Use correct API fields */}
          {storeId && (
            <div className="border border-slate-200 rounded-xl p-4 flex items-start gap-3 bg-slate-50/50 shadow-sm">
              <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                <span className="text-lg font-bold">{storeName?.charAt(0) ?? '?'}</span>
              </div>
              <div className="flex-1">
                <Link to={`/stores/${storeId}`} className="font-semibold text-slate-900 hover:text-blue-600 text-sm">
                  {storeName}
                </Link>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{storeDescription}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/stores/${storeId}`}>Visit</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews section */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Customer Reviews</h2>
        {ratingSummary && ratingSummary.total_reviews > 0 ? (
          <div>{/* Add your reviews list component here */}</div>
        ) : (
          <p className="text-slate-400 text-sm">No reviews yet. Be the first to review!</p>
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Product</DialogTitle>
            <DialogDescription>
              Help us keep the marketplace safe. Your report will be reviewed by our team.
            </DialogDescription>
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
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_REASONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Additional Details (optional)</label>
                <textarea
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  placeholder="Describe the issue in more detail (min 10 characters if provided)..."
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              {reportError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{reportError}</p>
              )}
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