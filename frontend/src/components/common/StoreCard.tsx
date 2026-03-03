import { Link } from 'react-router-dom'
import { FiPackage, FiStar } from 'react-icons/fi'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Store } from '@/types'

interface StoreCardProps {
  store: Store
}

export function StoreCard({ store }: StoreCardProps) {
  return (
    <Link to={`/stores/${store.id}`}>
      <Card className="group hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <div className="relative h-24 bg-gradient-to-r from-blue-50 to-indigo-50 overflow-hidden">
          {store.banner && (
            <img src={store.banner} alt={store.name} className="w-full h-full object-cover opacity-60" />
          )}
        </div>
        <CardContent className="p-4 -mt-6 relative">
          <div className="flex items-end gap-3">
            <img
              src={store.logo}
              alt={store.name}
              className="w-12 h-12 rounded-xl border-2 border-white shadow-sm bg-white"
              onError={e => { e.currentTarget.src = '/default-store-logo.png' }}
            />
            <div className="flex-1 min-w-0 pb-1">
              <h3 className="font-semibold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                {store.name}
              </h3>
              {store.isVerified && (
                <Badge variant="success" className="text-xs mt-0.5">Verified</Badge>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 line-clamp-2">{store.description}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <FiPackage className="h-3.5 w-3.5" />
              <span>{store.productCount} products</span>
            </div>
            <div className="flex items-center gap-1">
              <FiStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{store.rating}</span>
              <span>({store.reviewCount})</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
