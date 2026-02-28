import { useState } from 'react'
import { FiCheckCircle, FiXCircle, FiShield } from 'react-icons/fi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockStores } from '@/data/mockData'
import type { Store } from '@/types'

export function AdminSellersPage() {
  const [stores, setStores] = useState<FiGlobe[]>(mockStores)

  function toggleApproval(id: string) {
    setStores(prev => prev.map(s => s.id === id ? { ...s, isApproved: !s.isApproved } : s))
  }

  function toggleBlock(id: string) {
    setStores(prev => prev.map(s => s.id === id ? { ...s, isBlocked: !s.isBlocked } : s))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sellers</h1>
        <p className="text-slate-500 text-sm mt-1">{stores.length} registered sellers</p>
      </div>

      <div className="space-y-4">
        {stores.map(store => (
          <Card key={store.id} className={store.isBlocked ? 'opacity-60' : ''}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <img src={store.logo} alt={store.name} className="w-14 h-14 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{store.name}</h3>
                    <Badge variant={store.isApproved ? 'success' : 'warning'}>{store.isApproved ? 'Approved' : 'Pending'}</Badge>
                    {store.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{store.sellerName} · {store.contactEmail}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{store.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span>{store.productCount} products</span>
                    <span>⭐ {store.rating} ({store.reviewCount})</span>
                    <span>WhatsApp: +{store.whatsapp}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={store.isApproved ? 'text-amber-600 border-amber-300 hover:bg-amber-50' : 'text-green-600 border-green-300 hover:bg-green-50'}
                    onClick={() => toggleApproval(store.id)}
                  >
                    {store.isApproved ? <FiXCircle className="h-4 w-4 mr-1" /> : <FiCheckCircle className="h-4 w-4 mr-1" />}
                    {store.isApproved ? 'Revoke' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={store.isBlocked ? 'text-green-600 border-green-300 hover:bg-green-50' : 'text-red-500 border-red-200 hover:bg-red-50'}
                    onClick={() => toggleBlock(store.id)}
                  >
                    <FiShield className="h-4 w-4 mr-1" />
                    {store.isBlocked ? 'Unblock' : 'Block'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
