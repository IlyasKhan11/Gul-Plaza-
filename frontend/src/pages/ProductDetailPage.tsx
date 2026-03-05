import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiMessageCircle, FiChevronLeft, FiPackage, FiShield, FiTruck, FiZap, FiFlag } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarRating } from '@/components/common/StarRating'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
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

export function ProductDetailPage() {
  // Payment UI state
  const [paymentMethod, setPaymentMethod] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { isAuthenticated, user } = useAuth()
  const isBuyer = !user || user.role === 'buyer'
  const [selectedImage, setSelectedImage] = useState(0)
  const [qty, setQty] = useState(1)

  // Report dialog state
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState(false)

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<{ data: Product }>(`/products/${id}`)
      .then(res => {
        setProduct(res.data)
        setError(null)
      })
      .catch(err => {
        setError(err.message)
        setProduct(null)
      })
      .finally(() => setLoading(false))
  }, [id])

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

  const handleAddToCart = () => {
    if (!product) return
    for (let i = 0; i < qty; i++) addItem(product)
    navigate('/cart')
  }

  const handleBuyNow = () => {
    if (!product) return
    for (let i = 0; i < qty; i++) addItem(product)
    navigate('/checkout')
  }

  const openReport = () => {
    setReportReason('')
    setReportDesc('')
    setReportError(null)
    setReportSuccess(false)
    setReportOpen(true)
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

  // Use product fields directly from API response
  const discount = product.originalPrice && Number(product.originalPrice) > 0
    ? Math.round(((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100)
    : 0

  const whatsappUrl = '#'

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
        <span className="text-slate-700 truncate max-w-xs">{product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200">
            <img 
              src={product.images?.[selectedImage] ?? product.primary_image ?? ''} 
              alt={product.name} 
              className="w-full h-full object-cover" 
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === idx ? 'border-blue-500' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>

          <div className="flex items-center gap-3 mt-2">
            <StarRating rating={product.rating || 0} reviewCount={product.reviewCount || 0} size="md" />
            <Badge variant={(product.stock || 0) > 0 ? 'success' : 'destructive'}>
              {(product.stock || 0) > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
            </Badge>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-900">{formatPrice(Number(product.price))}</span>
            {product.originalPrice && (
              <>
                <span className="text-xl text-slate-400 line-through">{formatPrice(Number(product.originalPrice))}</span>
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
              <button 
                onClick={() => setQty(q => Math.max(1, q - 1))} 
                className="px-4 py-2 hover:bg-red-50 hover:text-red-600 text-slate-700 font-bold transition-colors"
              >
                −
              </button>
              <span className="px-5 py-2 text-sm font-bold text-slate-900 border-x-2 border-slate-200">{qty}</span>
              <button 
                onClick={() => setQty(q => Math.min(product.stock ?? 1, q + 1))} 
                className="px-4 py-2 hover:bg-green-50 hover:text-green-600 text-slate-700 font-bold transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          {isBuyer ? (
            <div className="space-y-2">
              <div className="flex gap-3 flex-wrap">
                <Button size="lg" className="flex-1" onClick={handleAddToCart} disabled={product.stock === 0}>
                  <FiShoppingCart className="h-5 w-5" />
                  Add to Cart
                </Button>
                <Button 
                  size="lg" 
                  variant="default" 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  onClick={handleBuyNow} 
                  disabled={product.stock === 0}
                >
                  <FiZap className="h-5 w-5" />
                  Buy Now
                </Button>
              </div>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-green-500 text-green-700 hover:bg-green-50"
                onClick={() => window.open(whatsappUrl, '_blank')}
              >
                <FiMessageCircle className="h-5 w-5" />
                WhatsApp Seller
              </Button>

              {/* Payment Method Section - Card Style */}
              <div className="mt-8">
                <h3 className="font-semibold text-lg text-slate-900 mb-4">Payment Method</h3>
                <div className="flex flex-col gap-4">
                  <label
                    className={`border rounded-xl p-4 cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-blue-500 bg-white shadow' : 'border-slate-200 bg-slate-50'}`}
                    onClick={() => setPaymentMethod('cod')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-lg text-slate-900">Cash on Delivery</span>
                        <div className="text-slate-500 text-sm mt-1">Pay in cash when your order arrives. The seller will confirm before shipping.</div>
                      </div>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="h-5 w-5 accent-blue-500"
                      />
                    </div>
                  </label>
                  <label
                    className={`border rounded-xl p-4 cursor-pointer transition-colors ${paymentMethod === 'easypaisa' ? 'border-blue-500 bg-white shadow' : 'border-slate-200 bg-slate-50'}`}
                    onClick={() => setPaymentMethod('easypaisa')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-lg text-slate-900">Easypaisa / Bank Transfer</span>
                        <div className="text-slate-500 text-sm mt-1">Transfer via Easypaisa or bank. Admin will verify your payment and notify the seller.</div>
                      </div>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="easypaisa"
                        checked={paymentMethod === 'easypaisa'}
                        onChange={() => setPaymentMethod('easypaisa')}
                        className="h-5 w-5 accent-blue-500"
                      />
                    </div>
                  </label>
                </div>
                {/* Show fields only for Easypaisa/Bank Transfer */}
                {paymentMethod === 'easypaisa' && (
                  <div className="space-y-3 border border-blue-100 rounded-xl p-4 bg-blue-50 mt-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Transaction ID *</label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Enter EasyPaisa or bank transaction ID"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Payment Screenshot *</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setPaymentScreenshot(e.target.files[0])
                          } else {
                            setPaymentScreenshot(null)
                          }
                        }}
                        className="mt-1 w-full"
                        required
                        key={paymentSuccess ? Math.random() : 'file'}
                      />
                      {paymentScreenshot && (
                        <div className="mt-2 text-xs text-slate-600">Selected file: {paymentScreenshot.name}</div>
                      )}
                    </div>
                  </div>
                )}
                {paymentError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mt-2">{paymentError}</p>
                )}
                {paymentSuccess && (
                  <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2 mt-2">Payment details submitted!</p>
                )}
                <Button
                  size="lg"
                  className="mt-4 w-full"
                  disabled={paymentSubmitting || !paymentMethod || (paymentMethod === 'easypaisa' && (!transactionId || !paymentScreenshot))}
                  onClick={() => {
                    setPaymentError(null)
                    setPaymentSuccess(false)
                    setPaymentSubmitting(true)
                    setTimeout(() => {
                      if (!paymentMethod) {
                        setPaymentError('Please select a payment method.')
                      } else if (paymentMethod === 'easypaisa' && (!transactionId || !paymentScreenshot)) {
                        setPaymentError('Please provide transaction ID and screenshot.')
                      } else {
                        setPaymentSuccess(true)
                        setTransactionId('')
                        setPaymentScreenshot(null)
                      }
                      setPaymentSubmitting(false)
                    }, 1200)
                  }}
                >
                  {paymentSubmitting ? 'Submitting...' : 'Submit Payment Details'}
                </Button>
              </div>
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
                <FiMessageCircle className="h-5 w-5" />
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

          {/* Store Card */}
          <div className="border border-slate-200 rounded-xl p-4 flex items-start gap-3 bg-slate-50/50 shadow-sm">
            <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
              <span className="text-lg font-bold">{product.storeName?.charAt(0) ?? '?'}</span>
            </div>
            <div className="flex-1">
              <Link to={`/stores/${product.storeId}`} className="font-semibold text-slate-900 hover:text-blue-600 text-sm">
                {product.storeName}
              </Link>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.store_description}</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/stores/${product.storeId}`}>Visit</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Customer Reviews</h2>
        <p className="text-slate-400 text-sm">No reviews yet. Be the first to review!</p>
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