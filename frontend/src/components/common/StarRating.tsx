import { FiStar } from 'react-icons/fi'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  reviewCount?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  interactive?: boolean
  onChange?: (rating: number) => void
}

export function StarRating({ rating, reviewCount, size = 'sm', className, interactive = false, onChange }: StarRatingProps) {
  const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0
  const sizeClasses = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' }
  const textClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }

  const handleClick = (star: number) => {
    if (interactive && onChange) {
      onChange(star)
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <FiStar
            key={star}
            onClick={() => handleClick(star)}
            className={cn(
              sizeClasses[size],
              star <= Math.round(safeRating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200',
              interactive && 'cursor-pointer hover:scale-110 transition-transform'
            )}
          />
        ))}
      </div>
      <span className={cn('font-medium text-slate-700', textClasses[size])}>{safeRating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className={cn('text-slate-400', textClasses[size])}>({reviewCount})</span>
      )}
    </div>
  )
}
