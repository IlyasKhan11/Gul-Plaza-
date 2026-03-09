import { useState, useEffect } from 'react'
import { FiUsers, FiShoppingBag, FiDollarSign, FiTrendingUp, FiRefreshCw, FiClock, FiCheckCircle, FiXCircle, FiHome } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { adminService, type DashboardStats, type ApiSellerApplication } from '@/services/adminService'
import { formatPrice } from '@/lib/utils'

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [sellerApplications, setSellerApplications] = useState<ApiSellerApplication[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<Array<{ month: string; revenue: number; order_count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchStats() {
    setLoading(true)
    setError(null)
    try {
      const [data, applications, revenue] = await Promise.all([
        adminService.getStats(),
        adminService.getSellerApplications(),
        adminService.getMonthlyRevenue(12),
      ])
      setStats(data)
      setSellerApplications(applications)
      setMonthlyRevenue(revenue)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveApplication(storeId: number) {
    try {
      await adminService.approveSellerApplication(storeId)
      // Refresh the applications list
      const applications = await adminService.getSellerApplications()
      setSellerApplications(applications)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve application')
    }
  }

  async function handleRejectApplication(storeId: number) {
    try {
      await adminService.rejectSellerApplication(storeId)
      // Refresh the applications list
      const applications = await adminService.getSellerApplications()
      setSellerApplications(applications)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject application')
    }
  }

  useEffect(() => { fetchStats() }, [])

  const statCards = stats
    ? [
        { title: 'Total Revenue', value: formatPrice(stats.total_revenue), icon: FiDollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Pending Orders', value: stats.pending_orders, icon: FiClock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { title: 'Total Users', value: stats.total_users, icon: FiUsers, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Total Products', value: stats.total_products, icon: FiTrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
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

      {stats && stats.low_stock_products_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
          <span className="font-semibold">{stats.low_stock_products_count} product(s)</span> are low on stock (under 5 units).
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

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FiTrendingUp className="h-4 w-4 text-blue-600" /> Monthly Platform Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyRevenue.length === 0 && !loading ? (
            <p className="text-sm text-slate-400 text-center py-10">No revenue data yet.</p>
          ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Seller Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FiHome className="h-4 w-4 text-orange-600" /> Pending Seller Applications
            {sellerApplications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sellerApplications.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sellerApplications.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FiHome className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No pending seller applications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sellerApplications.map((application) => (
                <div key={application.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{application.name}</h3>
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        Applied by: <span className="font-medium">{application.owner_name}</span> ({application.owner_email})
                      </p>
                      {application.description && (
                        <p className="text-sm text-slate-600 mb-2">{application.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        {application.contact_email && (
                          <span>Email: {application.contact_email}</span>
                        )}
                        {application.contact_phone && (
                          <span>Phone: {application.contact_phone}</span>
                        )}
                        <span>Applied: {new Date(application.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => handleApproveApplication(application.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <FiCheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectApplication(application.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <FiXCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
