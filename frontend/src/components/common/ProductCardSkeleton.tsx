import { Skeleton } from '@/components/ui/skeleton'

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Image */}
      <Skeleton className="w-full aspect-square rounded-none" />
      <div className="p-4 space-y-2">
        {/* Store name */}
        <Skeleton className="h-3 w-24" />
        {/* Product name */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        {/* Stars */}
        <Skeleton className="h-3 w-20 mt-1" />
        {/* Price */}
        <Skeleton className="h-5 w-28 mt-1" />
        {/* Button */}
        <Skeleton className="h-8 w-full mt-2 rounded-md" />
      </div>
    </div>
  )
}
