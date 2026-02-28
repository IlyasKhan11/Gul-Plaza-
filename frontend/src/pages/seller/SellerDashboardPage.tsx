import { DollarSign, Package, ShoppingBag, Wallet, TrendingUp, Store, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { useAuth } from '@/context/AuthContext'
import { mockOrders, mockProducts, mockSalesData, mockWithdrawals, mockStores } from '@/data/mockData'
import { formatPrice, formatDate } from '@/lib/utils'

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#2563eb', '#22c55e', '#ef4444']

export function SellerDashboardPage() {
  const { user } = useAuth()
  const myStore = mockStores.some(s => s.sellerId === user?.id)
  const myOrders = mockOrders.filter(o => o.sellerId === user?.id)
  const myProducts = mockProducts.filter(p => p.sellerId === user?.id)
  const myWithdrawals = mockWithdrawals.filter(w => w.sellerId === user?.id)
  const totalRevenue = myOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
  const pendingWithdrawals = myWithdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + w.amount, 0)

  const statusCounts = [
    { name: 'Pending', value: myOrders.filter(o => o.status === 'pending').length },
    { name: 'Processing', value: myOrders.filter(o => o.status === 'processing').length },
    { name: 'Shipped', value: myOrders.filter(o => o.status === 'shipped').length },
    { name: 'Delivered', value: myOrders.filter(o => o.status === 'delivered').length },
    { name: 'Cancelled', value: myOrders.filter(o => o.status === 'cancelled').length },
  ].filter(s => s.value > 0)

  const stats = [
    { title: 'Total Revenue', value: formatPrice(totalRevenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Total Orders', value: myOrders.length, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Products', value: myProducts.length, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Pending Withdrawal', value: formatPrice(pendingWithdrawals), icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back! Here's your store overview.</p>
      </div>

      {/* Store Setup Banner */}
      {!myStore && (
        <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Store className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 text-sm">Complete your store setup</p>
            <p className="text-xs text-slate-500 mt-0.5">Create your store to list products and start receiving orders.</p>
          </div>
          <Button size="sm" asChild>
            <Link to="/seller/store">
              Set Up Store <ArrowRight className="h-4 w-4" />
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

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-blue-600" /> Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mockSalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Status</CardTitle>
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
          {myOrders.length === 0 ? (
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
                  {myOrders.slice(0, 5).map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-mono text-xs text-slate-500">#{order.id}</td>
                      <td className="py-3 text-slate-800">{order.buyerName}</td>
                      <td className="py-3 font-semibold text-slate-900">{formatPrice(order.total)}</td>
                      <td className="py-3"><OrderStatusBadge status={order.status} /></td>
                      <td className="py-3 text-slate-500 text-xs">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
