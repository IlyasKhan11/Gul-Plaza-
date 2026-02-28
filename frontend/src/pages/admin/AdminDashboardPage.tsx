import { Users, Store, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { mockUsers, mockOrders, mockStores, mockTransactions, mockAdminSalesData } from '@/data/mockData'
import { formatPrice, formatDate } from '@/lib/utils'

export function AdminDashboardPage() {
  const totalGMV = mockOrders.reduce((s, o) => s + o.total, 0)
  const totalRevenue = mockTransactions.reduce((s, t) => s + t.commission, 0)
  const buyers = mockUsers.filter(u => u.role === 'buyer').length
  const sellers = mockUsers.filter(u => u.role === 'seller').length

  const stats = [
    { title: 'Total GMV', value: formatPrice(totalGMV), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Platform Revenue', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Total Users', value: buyers + sellers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Active Sellers', value: sellers, icon: Store, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Total Orders', value: mockOrders.length, icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Platform overview and analytics</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(({ title, value, icon: Icon, color, bg }) => (
          <Card key={title}>
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-blue-600" /> Monthly Platform Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mockAdminSalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockOrders.slice(0, 4).map(order => (
                <div key={order.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{order.buyerName}</p>
                    <p className="text-xs text-slate-500">{order.storeName} · {formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatPrice(order.total)}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sellers */}
        <Card>
          <CardHeader><CardTitle className="text-base">Seller Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockStores.map(store => (
                <div key={store.id} className="flex items-center gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <img src={store.logo} alt={store.name} className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{store.name}</p>
                    <p className="text-xs text-slate-500">{store.productCount} products</p>
                  </div>
                  <Badge variant={store.isApproved ? 'success' : 'warning'}>{store.isApproved ? 'Approved' : 'Pending'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
