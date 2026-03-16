import { Link } from 'react-router-dom'
import { FiPackage, FiStar } from 'react-icons/fi'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Store } from '@/types'

interface StoreCardProps {
  store: Store
}

export function StoreCard({ store }: StoreCardProps) {
  const [logoError, setLogoError] = useState(false)

  // Defensive: Ensure store data is valid
  const safeName = typeof store.name === 'string' ? store.name : 'Store'
  const safeDescription = typeof store.description === 'string' ? store.description : ''
  const safeLogo = store.logo && !logoError ? store.logo : null

  return (
    <Link to={`/stores/${store.id}`}>
      <Card className="group hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {safeLogo ? (
              <img
                src={safeLogo}
                alt={`${safeName} logo`}
                className="w-12 h-12 rounded-xl border-2 border-white dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-12 h-12 rounded-xl border-2 border-white dark:border-slate-700 shadow-sm bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <FiPackage className="h-6 w-6 text-slate-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {safeName}
              </h3>
              {store.isVerified && (
                <Badge variant="success" className="text-xs mt-0.5">Verified</Badge>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{safeDescription}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <FiPackage className="h-3.5 w-3.5" />
              <span>{typeof store.productCount === 'number' ? store.productCount : 0} products</span>
            </div>
            <div className="flex items-center gap-1">
              <FiStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{typeof store.rating === 'number' ? store.rating.toFixed(1) : '0.0'}</span>
              <span>({typeof store.reviewCount === 'number' ? store.reviewCount : 0})</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
