import { useState, useEffect } from 'react'
import { FiDollarSign, FiPackage, FiShoppingBag, FiBriefcase, FiTrendingUp, FiGlobe, FiArrowRight, FiRefreshCw, FiClock } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { useAuth } from '@/context/AuthContext'
import { sellerService } from '@/services/sellerService'
import { formatPrice, formatDate } from '@/lib/utils'

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#2563eb', '#22c55e', '#ef4444']

export function SellerDashboardPage() {
  const { user } = useAuth()
  const [storeProfile, setStoreProfile] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const totalRevenue = orders?.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0) || 0
  const statusCounts = [
    { name: 'Pending', value: orders?.filter(o => o.status === 'pending').length || 0 },
    { name: 'Processing', value: orders?.filter(o => o.status === 'processing').length || 0 },
    { name: 'Shipped', value: orders?.filter(o => o.status === 'shipped').length || 0 },
    { name: 'Delivered', value: orders?.filter(o => o.status === 'delivered').length || 0 },
    { name: 'Cancelled', value: orders?.filter(o => o.status === 'cancelled').length || 0 },
  ].filter(s => s.value > 0)

  const stats = [
    { title: 'Total Revenue', value: formatPrice(totalRevenue), icon: FiDollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Total Orders', value: orders?.length || 0, icon: FiShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Products', value: products?.length || 0, icon: FiPackage, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Pending Withdrawal', value: formatPrice(0), icon: FiBriefcase, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  async function fetchDashboardData() {
    setLoading(true)
    setError(null)
    try {
      const [profileData, ordersData, productsData, revenueData] = await Promise.all([
        sellerService.getProfile(),
        sellerService.getOrders(),
        sellerService.getProducts(),
        sellerService.getMonthlyRevenue(6).catch(() => ({ monthly_revenue: [], total_revenue: 0 }))
      ])
      setStoreProfile(profileData)
      setOrders(ordersData.orders || [])
      setProducts(productsData.products || [])
      setMonthlyRevenue(revenueData?.monthly_revenue || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'seller') {
      fetchDashboardData()
    }
  }, [user])

  if (user?.role !== 'seller') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Access Denied</h2>
          <p className="text-slate-500 text-sm mt-1">You need to be an approved seller to access this dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Seller Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back! Here's your store overview.</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchDashboardData} disabled={loading}>
          <FiRefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error} — <button className="underline" onClick={fetchDashboardData}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5 h-24 animate-pulse bg-slate-100 rounded-xl" /></Card>
          ))}
        </div>
      ) : (
        <>
          {/* Store Pending Approval Banner */}
          {storeProfile?.store && !storeProfile.store.is_active && (
            <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <FiClock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">Store Pending Approval</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your store <span className="font-medium text-slate-700">"{storeProfile.store.name}"</span> is under review. You can add products and receive orders once an admin approves it.
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/seller/store">View Store</Link>
              </Button>
            </div>
          )}

          {/* Store Setup Banner */}
          {!storeProfile?.store && (
            <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <FiGlobe className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">Complete your store setup</p>
                <p className="text-xs text-slate-500 mt-0.5">Configure your store to list products and start receiving orders.</p>
              </div>
              <Button size="sm" asChild>
                <Link to="/seller/store">
                  Set Up Store <FiArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ title, value, icon: Icon, color, bg }) => (
              <Card key={title}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">{title}</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Charts and Recent Orders */}
      {!loading && (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FiTrendingUp className="h-4 w-4 text-blue-600" /> Monthly Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyRevenue && monthlyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month_name" tick={{ fontSize: 12 }} stroke="#888" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#888" tickFormatter={(value) => `Rs.${value / 1000}k`} />
                      <Tooltip 
                        formatter={(value) => [`Rs.${Number(value).toLocaleString()}`, 'Revenue']}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-slate-300 text-sm">No revenue data yet</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FiTrendingUp className="h-4 w-4 text-purple-600" /> Order Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusCounts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                        {statusCounts.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-slate-300 text-sm">No orders yet</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {!orders || orders.length === 0 ? (
                <p className="text-slate-400 text-sm py-8 text-center">No orders yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left pb-3 text-slate-500 font-medium">Order ID</th>
                        <th className="text-left pb-3 text-slate-500 font-medium">Buyer</th>
                        <th className="text-left pb-3 text-slate-500 font-medium">Amount</th>
                        <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                        <th className="text-left pb-3 text-slate-500 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.slice(0, 5).map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 font-mono text-xs text-slate-500">#{order.id}</td>
                          <td className="py-3 text-slate-800">{order.buyer_name || 'N/A'}</td>
                          <td className="py-3 font-semibold text-slate-900">{formatPrice(order.total || 0)}</td>
                          <td className="py-3"><OrderStatusBadge status={order.status} /></td>
                          <td className="py-3 text-slate-500 text-xs">{formatDate(order.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
