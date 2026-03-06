import { useState, useEffect, useCallback } from 'react'
import { FiRefreshCw, FiDownload } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { adminService, type ApiTransaction } from '@/services/adminService'
import { formatPrice, formatDate } from '@/lib/utils'

export function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [totals, setTotals] = useState({
    total_commission: 0,
    released_commission: 0,
    pending_commission: 0,
    seller_payouts: 0
  })

  const fetchTransactions = useCallback(async (p: number, status: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getTransactions({
        page: p,
        limit: 20,
        status: status === 'all' ? undefined : status
      })
      setTransactions(data.transactions)
      setTotals(data.totals)
      setTotalPages(data.pagination.total_pages)
      setTotalTransactions(data.pagination.total_transactions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTransactions(1, 'all') }, [fetchTransactions])

  function handleFilterChange(status: string) {
    setFilter(status)
    setPage(1)
    fetchTransactions(1, status)
  }

  function changePage(newPage: number) {
    setPage(newPage)
    fetchTransactions(newPage, filter)
  }

  const statusVariant = (s: string): 'warning' | 'success' | 'secondary' => {
    if (s === 'released') return 'success'
    if (s === 'withdrawn') return 'secondary'
    return 'warning'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 text-sm mt-1">Platform revenue and commission tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="released">Released</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FiDownload className="h-4 w-4 mr-1" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => adminService.exportTransactionsCSV(filter === 'all' ? undefined : filter)}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => adminService.exportTransactionsPDF(filter === 'all' ? undefined : filter)}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => fetchTransactions(page, filter)} disabled={loading}>
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchTransactions(page, filter)}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Total Platform Revenue</p>
            {loading ? (
              <div className="h-8 bg-slate-200 animate-pulse rounded w-32 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-green-700 mt-1">{formatPrice(totals.total_commission)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Pending Seller Payouts</p>
            {loading ? (
              <div className="h-8 bg-slate-200 animate-pulse rounded w-32 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-amber-600 mt-1">{formatPrice(totals.seller_payouts)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transaction Records</CardTitle>
            <p className="text-xs text-slate-500">{totalTransactions} total transactions</p>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-3 text-slate-500 font-medium">Order</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Store</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Order Amount</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Commission</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Seller Share</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-mono text-xs text-slate-400">#{tx.order_id}</td>
                      <td className="py-3 text-slate-700">{tx.store_name ?? '—'}</td>
                      <td className="py-3 text-slate-800">{formatPrice(tx.amount)}</td>
                      <td className="py-3 font-medium text-green-700">{formatPrice(tx.commission)}</td>
                      <td className="py-3 text-slate-600">{formatPrice(tx.seller_share)}</td>
                      <td className="py-3">
                        <Badge variant={statusVariant(tx.status)} className="capitalize">{tx.status}</Badge>
                      </td>
                      <td className="py-3 text-slate-400 text-xs">{formatDate(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changePage(page - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
