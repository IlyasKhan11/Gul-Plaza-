export function ProductCardSkeleton({ delay = 0 }: { delay?: number }) {
  const style = delay ? { animationDelay: `${delay}ms` } : undefined

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm w-full">
      {/* Image */}
      <div className="animate-wind w-full aspect-square" style={style} />

      <div className="p-4 space-y-2.5">
        {/* Name line 1 */}
        <div className="animate-wind h-4 w-full rounded-md" style={style} />
        {/* Name line 2 */}
        <div className="animate-wind h-4 w-3/4 rounded-md" style={style} />
        {/* Rating */}
        <div className="animate-wind h-3 w-20 rounded-md" style={style} />
        {/* Price + button */}
        <div className="flex items-center justify-between pt-1">
          <div className="animate-wind h-6 w-24 rounded-md" style={style} />
          <div className="animate-wind h-10 w-10 rounded-full" style={style} />
        </div>
      </div>
    </div>
  )
}
