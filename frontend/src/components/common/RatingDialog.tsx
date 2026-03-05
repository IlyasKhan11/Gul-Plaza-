import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from './StarRating'
import { ratingService, type RatingSubmitData } from '@/services/ratingService'
import { FiStar } from 'react-icons/fi'

interface RateProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: {
    product_id: number
    title: string
    store_name: string
    order_id: number
  }
  existingRating?: { rating: number; review: string | null }
  onSuccess: () => void
}

export function RateProductDialog({ open, onOpenChange, product, existingRating, onSuccess }: RateProductDialogProps) {
  const [rating, setRating] = useState(existingRating?.rating || 0)
  const [review, setReview] = useState(existingRating?.review || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setRating(existingRating?.rating || 0)
      setReview(existingRating?.review || '')
      setError(null)
    }
  }, [open, existingRating])

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data: RatingSubmitData = {
        product_id: product.product_id,
        rating,
        review: review.trim() || undefined,
        order_id: product.order_id
      }

      await ratingService.submitRating(data)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-slate-900">{product.title}</p>
            <p className="text-sm text-slate-500">{product.store_name}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Your Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <FiStar
                    className={`h-8 w-8 ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-200 text-slate-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
              {rating === 0 && 'Click to rate'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Review (optional)</label>
            <Textarea
              placeholder="Share your experience with this product..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || rating === 0}>
              {loading ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
