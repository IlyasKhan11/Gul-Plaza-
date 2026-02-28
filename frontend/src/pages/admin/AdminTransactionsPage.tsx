import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { mockTransactions } from '@/data/mockData'
import { formatPrice, formatDate } from '@/lib/utils'

export function AdminTransactionsPage() {
  const totalCommission = mockTransactions.reduce((s, t) => s + t.commission, 0)
  const pendingPayouts = mockTransactions.filter(t => t.status === 'released').reduce((s, t) => s + t.sellerShare, 0)

  const statusVariant = (s: string): 'warning' | 'success' | 'secondary' => {
    if (s === 'released') return 'success'
    if (s === 'withdrawn') return 'secondary'
    return 'warning'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
        <p className="text-slate-500 text-sm mt-1">Platform revenue and commission tracking</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Total Platform Revenue</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatPrice(totalCommission)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Pending Seller Payouts</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{formatPrice(pendingPayouts)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Transaction Records</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left pb-3 text-slate-500 font-medium">Order</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Store</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Order Amount</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Commission (5%)</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Seller Share</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-mono text-xs text-slate-400">#{tx.orderId}</td>
                    <td className="py-3 text-slate-700">{tx.storeName}</td>
                    <td className="py-3 text-slate-800">{formatPrice(tx.amount)}</td>
                    <td className="py-3 font-medium text-green-700">{formatPrice(tx.commission)}</td>
                    <td className="py-3 text-slate-600">{formatPrice(tx.sellerShare)}</td>
                    <td className="py-3">
                      <Badge variant={statusVariant(tx.status)} className="capitalize">{tx.status}</Badge>
                    </td>
                    <td className="py-3 text-slate-400 text-xs">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
