import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FiTrendingUp, FiShoppingBag, FiUsers, FiGlobe } from 'react-icons/fi'
import { mockOrders, mockUsers, mockStores, mockAdminSalesData, mockTransactions, mockCategories } from '@/data/mockData'
import { formatPrice } from '@/lib/utils'

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#2563eb', '#22c55e', '#ef4444']

export function AdminReportsPage() {
  // Order status breakdown
  const statusCounts = [
    { name: 'Pending', value: mockOrders.filter(o => o.status === 'pending').length },
    { name: 'Processing', value: mockOrders.filter(o => o.status === 'processing').length },
    { name: 'Shipped', value: mockOrders.filter(o => o.status === 'shipped').length },
    { name: 'Delivered', value: mockOrders.filter(o => o.status === 'delivered').length },
    { name: 'Cancelled', value: mockOrders.filter(o => o.status === 'cancelled').length },
  ].filter(s => s.value > 0)

  // Top sellers by GMV
  const topSellers = mockStores.map(store => ({
    name: store.name,
    gmv: mockTransactions.filter(t => t.sellerId === store.sellerId).reduce((s, t) => s + t.amount, 0),
    orders: mockOrders.filter(o => o.sellerId === store.sellerId).length,
  })).sort((a, b) => b.gmv - a.gmv).slice(0, 5)

  // Category breakdown
  const categoryStats = mockCategories.map(cat => ({
    name: cat.name,
    orders: mockOrders.filter(o => o.items.some(i => i.product.categoryId === cat.id)).length,
  })).filter(c => c.orders > 0).sort((a, b) => b.orders - a.orders)

  // FiUser growth (mock by month)
  const userGrowth = mockAdminSalesData.map((d, i) => ({
    month: d.month,
    users: 20 + i * 8,
    sellers: 2 + i,
  }))

  const totalGMV = mockOrders.reduce((s, o) => s + o.total, 0)
  const totalCommission = mockTransactions.reduce((s, t) => s + t.commission, 0)
  const conversionRate = mockOrders.length > 0 ? ((mockOrders.filter(o => o.status === 'delivered').length / mockOrders.length) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of platform performance and analytics</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total GMV', value: formatPrice(totalGMV), icon: FiTrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Platform Revenue', value: formatPrice(totalCommission), icon: FiTrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Orders', value: mockOrders.length, icon: FiShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Delivery Rate', value: `${conversionRate}%`, icon: FiUsers, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{label}</p>
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

      {/* Revenue & Orders Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FiTrendingUp className="h-4 w-4 text-blue-600" /> Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* FiUser Growth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FiUsers className="h-4 w-4 text-purple-600" /> FiUser & Seller Growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="users" name="Buyers" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="sellers" name="Sellers" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Sellers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FiGlobe className="h-4 w-4 text-amber-600" /> Top Sellers by GMV
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSellers.length === 0 ? (
              <p className="text-slate-400 text-sm py-6 text-center">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topSellers.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-6 text-xs font-bold text-slate-400 text-center">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.orders} orders</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{formatPrice(s.gmv)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FiShoppingBag className="h-4 w-4 text-indigo-600" /> Orders by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryStats.length === 0 ? (
              <p className="text-slate-400 text-sm py-6 text-center">No data yet</p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map((c, i) => {
                  const max = categoryStats[0].orders
                  return (
                    <div key={c.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 font-medium">{c.name}</span>
                        <span className="text-slate-500">{c.orders} orders</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${(c.orders / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
