import { FiStar } from 'react-icons/fi'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  reviewCount?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StarRating({ rating, reviewCount, size = 'sm', className }: StarRatingProps) {
  const sizeClasses = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' }
  const textClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <FiStar
            key={star}
            className={cn(
              sizeClasses[size],
              star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'
            )}
          />
        ))}
      </div>
      <span className={cn('font-medium text-slate-700', textClasses[size])}>{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className={cn('text-slate-400', textClasses[size])}>({reviewCount})</span>
      )}
    </div>
  )
}
