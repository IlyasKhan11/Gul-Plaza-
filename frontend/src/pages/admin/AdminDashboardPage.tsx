import { useState, useEffect } from 'react'
import { FiUsers, FiGlobe, FiShoppingBag, FiDollarSign, FiTrendingUp, FiRefreshCw } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { adminService, type DashboardStats } from '@/services/adminService'
import { mockAdminSalesData } from '@/data/mockData'
import { formatPrice, formatDate } from '@/lib/utils'

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchStats() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const statCards = stats
    ? [
        { title: 'Total GMV', value: formatPrice(stats.total_gmv), icon: FiDollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Platform Revenue', value: formatPrice(stats.platform_revenue), icon: FiTrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Total Users', value: stats.total_users, icon: FiUsers, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Active Sellers', value: stats.total_sellers, icon: FiGlobe, color: 'text-amber-600', bg: 'bg-amber-50' },
        { title: 'Total Orders', value: stats.total_orders, icon: FiShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Platform overview and analytics</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchStats} disabled={loading}>
          <FiRefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error} — <button className="underline" onClick={fetchStats}>Retry</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 h-24 animate-pulse bg-slate-100 rounded-xl" /></Card>
            ))
          : statCards.map(({ title, value, icon: Icon, color, bg }) => (
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

      {/* Revenue Chart (static mock data until we build a time-series endpoint) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FiTrendingUp className="h-4 w-4 text-blue-600" /> Monthly Platform Revenue
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
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : stats?.recent_orders.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {stats?.recent_orders.map(order => (
                  <div key={order.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{order.buyer_name}</p>
                      <p className="text-xs text-slate-500">
                        {order.store_name ?? 'Unknown store'} · {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatPrice(parseFloat(order.total_amount))}</p>
                      <OrderStatusBadge status={order.status as never} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seller Overview */}
        <Card>
          <CardHeader><CardTitle className="text-base">Seller Overview</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : stats?.recent_sellers.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No sellers yet</p>
            ) : (
              <div className="space-y-3">
                {stats?.recent_sellers.map(seller => (
                  <div key={seller.id} className="flex items-center gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {seller.seller_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{seller.name ?? seller.seller_name}</p>
                      <p className="text-xs text-slate-500">{seller.product_count} products</p>
                    </div>
                    <Badge variant={seller.is_approved ? 'success' : 'warning'}>
                      {seller.is_approved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
