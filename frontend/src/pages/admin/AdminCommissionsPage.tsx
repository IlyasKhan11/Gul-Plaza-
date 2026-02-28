import { useState } from 'react'
import { FiPercent, FiTrendingUp, FiDollarSign, FiCheckCircle, FiEdit2 } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { mockTransactions, mockStores, platformSettings } from '@/data/mockData'
import { formatPrice } from '@/lib/utils'

export function AdminCommissionsPage() {
  const [rate, setRate] = useState(platformSettings.commissionRate)
  const [editOpen, setEditOpen] = useState(false)
  const [inputRate, setInputRate] = useState(String(platformSettings.commissionRate))
  const [successOpen, setSuccessOpen] = useState(false)

  const totalCommission = mockTransactions.reduce((s, t) => s + t.commission, 0)
  const pendingCommission = mockTransactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.commission, 0)
  const releasedCommission = mockTransactions.filter(t => t.status !== 'pending').reduce((s, t) => s + t.commission, 0)

  // Commission per seller
  const sellerCommissions = mockStores.map(store => {
    const txs = mockTransactions.filter(t => t.sellerId === store.sellerId)
    return {
      store,
      gmv: txs.reduce((s, t) => s + t.amount, 0),
      commission: txs.reduce((s, t) => s + t.commission, 0),
      orders: txs.length,
    }
  }).filter(s => s.orders > 0)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(inputRate)
    if (isNaN(parsed) || parsed < 0 || parsed > 50) return
    platformSettings.commissionRate = parsed
    setRate(parsed)
    setEditOpen(false)
    setSuccessOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Commission Management</h1>
        <p className="text-slate-500 text-sm mt-1">Set platform commission rate and track earnings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 border-2 border-blue-100 bg-blue-50/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FiPercent className="h-5 w-5 text-blue-600" />
              </div>
              <Button size="sm" variant="outline" onClick={() => { setInputRate(String(rate)); setEditOpen(true) }}>
                <FiEdit2 className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
            <p className="text-3xl font-bold text-blue-700">{rate}%</p>
            <p className="text-xs text-slate-500 mt-1">Current Commission Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
              <FiTrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatPrice(totalCommission)}</p>
            <p className="text-xs text-slate-500 mt-1">Total Commission Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
              <FiDollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatPrice(pendingCommission)}</p>
            <p className="text-xs text-slate-500 mt-1">Pending (Not Yet Released)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
              <FiDollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatPrice(releasedCommission)}</p>
            <p className="text-xs text-slate-500 mt-1">Confirmed (Released Orders)</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-seller breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission by Seller</CardTitle>
        </CardHeader>
        <CardContent>
          {sellerCommissions.length === 0 ? (
            <p className="text-slate-400 text-sm py-6 text-center">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-3 text-slate-500 font-medium">Seller / FiGlobe</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Orders</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Total GMV</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Commission ({rate}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellerCommissions.map(({ store, gmv, commission, orders }) => (
                    <tr key={store.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3">
                        <p className="font-medium text-slate-800">{store.name}</p>
                        <p className="text-xs text-slate-500">{store.sellerName}</p>
                      </td>
                      <td className="py-3 text-slate-600">{orders}</td>
                      <td className="py-3 text-slate-800">{formatPrice(gmv)}</td>
                      <td className="py-3 font-semibold text-green-700">{formatPrice(commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Commission Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Commission Rate</DialogTitle>
            <DialogDescription>
              This rate applies to all new orders. Existing transactions are not affected.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="rate">Commission Rate (%)</Label>
              <div className="relative mt-1">
                <Input
                  id="rate"
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={inputRate}
                  onChange={e => setInputRate(e.target.value)}
                  className="pr-8"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Enter a value between 0 and 50.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">FiSave Rate</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <FiCheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <DialogTitle>Rate Updated!</DialogTitle>
            <p className="text-sm text-slate-500">Commission rate has been set to <strong>{rate}%</strong>. It will apply to all new orders.</p>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setSuccessOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
