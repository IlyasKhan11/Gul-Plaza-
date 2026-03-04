import { FiPackage, FiClock } from 'react-icons/fi'
import { Card, CardContent } from '@/components/ui/card'

export function SellerOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-slate-500 text-sm mt-1">Manage orders for your store</p>
      </div>

      <Card>
        <CardContent className="py-20 text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <FiPackage className="h-16 w-16 text-slate-200" />
            <FiClock className="h-6 w-6 text-slate-400 absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700 mb-1">Seller Orders Coming Soon</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            The seller order management feature is under development. You'll be able to view and manage your store's orders here soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
