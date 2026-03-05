import { useState, useEffect } from 'react'
import { FiDollarSign, FiClock, FiCheckCircle } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { sellerService } from '@/services/sellerService'
import { formatPrice, formatDate } from '@/lib/utils'

export function SellerEarningsPage() {
  const { user } = useAuth()
  const [earningsData, setEarningsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === 'seller') {
      sellerService.getSellerEarnings()
        .then(data => setEarningsData(data))
        .catch(() => setEarningsData(null))
        .finally(() => setLoading(false))
    }
  }, [user])

  const totalEarned = earningsData?.totals?.total_earned || 0
  const pendingRelease = earningsData?.totals?.pending_release || 0
  const withdrawn = earningsData?.totals?.withdrawn || 0

  const stats = [
    { title: 'Total Earned', value: formatPrice(totalEarned), icon: FiDollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Pending Release', value: formatPrice(pendingRelease), icon: FiClock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Withdrawn', value: formatPrice(withdrawn), icon: FiCheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  ]

  const statusVariant = (s: string): 'success' | 'warning' | 'secondary' => {
    if (s === 'released') return 'success'
    if (s === 'pending') return 'warning'
    return 'secondary'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
        <p className="text-slate-500 text-sm mt-1">Track your revenue and payouts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      <Card>
        <CardHeader><CardTitle className="text-base">Transaction History</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-slate-400 py-10 text-sm">Loading...</p>
          ) : !earningsData?.transactions || earningsData.transactions.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-3 text-slate-500 font-medium">Order</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Amount</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {earningsData.transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-mono text-xs text-slate-500">#{tx.order_id}</td>
                      <td className="py-3 text-slate-800">{formatPrice(tx.amount)}</td>
                      <td className="py-3">
                        <Badge variant={statusVariant(tx.status)} className="capitalize">{tx.status}</Badge>
                      </td>
                      <td className="py-3 text-slate-500 text-xs">{formatDate(tx.created_at)}</td>
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
