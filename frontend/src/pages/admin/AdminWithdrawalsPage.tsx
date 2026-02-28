import { useState } from 'react'
import { CheckCircle, XCircle, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { mockWithdrawals } from '@/data/mockData'
import { formatPrice, formatDate } from '@/lib/utils'
import type { WithdrawalRequest } from '@/types'

export function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(mockWithdrawals)
  const [filter, setFilter] = useState('all')
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [lastAction, setLastAction] = useState('')

  const filtered = filter === 'all' ? withdrawals : withdrawals.filter(w => w.status === filter)

  const pending = withdrawals.filter(w => w.status === 'pending').length
  const totalPending = withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + w.amount, 0)
  const totalApproved = withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0)

  function handleConfirm() {
    if (!confirmAction) return
    setWithdrawals(prev => prev.map(w =>
      w.id === confirmAction.id ? { ...w, status: confirmAction.action } : w
    ))
    setLastAction(confirmAction.action === 'approved' ? 'approved' : 'rejected')
    setConfirmAction(null)
    setSuccessOpen(true)
  }

  const statusVariant = (s: string): 'warning' | 'success' | 'destructive' => {
    if (s === 'approved') return 'success'
    if (s === 'rejected') return 'destructive'
    return 'warning'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Withdrawal Requests</h1>
        <p className="text-slate-500 text-sm mt-1">Review and approve seller payout requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{pending}</p>
            <p className="text-xs text-slate-500 mt-1">Pending Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatPrice(totalPending)}</p>
            <p className="text-xs text-slate-500 mt-1">Amount Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatPrice(totalApproved)}</p>
            <p className="text-xs text-slate-500 mt-1">Total Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Withdrawal List</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">No withdrawal requests</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-3 text-slate-500 font-medium">Seller / Store</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Amount</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Bank / Method</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Account</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Date</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                    <th className="text-right pb-3 text-slate-500 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3">
                        <p className="font-medium text-slate-800">{w.storeName}</p>
                        <p className="text-xs text-slate-500">{w.accountName}</p>
                      </td>
                      <td className="py-3 font-bold text-slate-900">{formatPrice(w.amount)}</td>
                      <td className="py-3 text-slate-600">{w.bankName}</td>
                      <td className="py-3 font-mono text-xs text-slate-500">{w.accountNumber}</td>
                      <td className="py-3 text-slate-400 text-xs">{formatDate(w.createdAt)}</td>
                      <td className="py-3">
                        <Badge variant={statusVariant(w.status)} className="capitalize">{w.status}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        {w.status === 'pending' ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => setConfirmAction({ id: w.id, action: 'approved' })}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => setConfirmAction({ id: w.id, action: 'rejected' })}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${confirmAction?.action === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
              {confirmAction?.action === 'approved'
                ? <CheckCircle className="h-7 w-7 text-green-600" />
                : <XCircle className="h-7 w-7 text-red-600" />}
            </div>
            <DialogTitle>
              {confirmAction?.action === 'approved' ? 'Approve Withdrawal?' : 'Reject Withdrawal?'}
            </DialogTitle>
            <p className="text-sm text-slate-500">
              {confirmAction?.action === 'approved'
                ? 'The seller will be notified and the amount will be paid out.'
                : 'The withdrawal request will be declined.'}
            </p>
          </div>
          <DialogFooter className="justify-center gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              className={confirmAction?.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${lastAction === 'approved' ? 'bg-green-100' : 'bg-slate-100'}`}>
              <CheckCircle className={`h-7 w-7 ${lastAction === 'approved' ? 'text-green-600' : 'text-slate-600'}`} />
            </div>
            <DialogTitle>Withdrawal {lastAction === 'approved' ? 'Approved' : 'Rejected'}</DialogTitle>
            <p className="text-sm text-slate-500">The withdrawal request has been {lastAction}.</p>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setSuccessOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
