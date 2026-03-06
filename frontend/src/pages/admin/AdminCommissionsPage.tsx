import { useState, useEffect, useCallback } from 'react'
import { FiPercent, FiTrendingUp, FiDollarSign, FiCheckCircle, FiEdit2, FiRefreshCw } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { adminService, type ApiSellerCommission } from '@/services/adminService'
import { formatPrice } from '@/lib/utils'

export function AdminCommissionsPage() {
  const [rate, setRate] = useState(5)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [inputRate, setInputRate] = useState('5')
  const [successOpen, setSuccessOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Transaction totals
  const [totals, setTotals] = useState({
    total_commission: 0,
    released_commission: 0,
    pending_commission: 0,
    seller_payouts: 0
  })

  // Seller commissions
  const [sellerCommissions, setSellerCommissions] = useState<ApiSellerCommission[]>([])
  const [sellersLoading, setSellersLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch commission rate
      const rateData = await adminService.getCommissionRate()
      setRate(rateData.commission_rate)
      setInputRate(String(rateData.commission_rate))

      // Fetch transactions for totals
      const transData = await adminService.getTransactions({ limit: 1 })
      setTotals(transData.totals)

      // Fetch seller commissions
      const sellerData = await adminService.getSellerCommissions({ limit: 50 })
      setSellerCommissions(sellerData.sellers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
      setSellersLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(inputRate)
    if (isNaN(parsed) || parsed < 0 || parsed > 50) return
    
    setSaving(true)
    try {
      const result = await adminService.updateCommissionRate(parsed)
      setRate(result.commission_rate)
      setEditOpen(false)
      setSuccessOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update commission rate')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Commission Management</h1>
        <p className="text-slate-500 text-sm mt-1">Set platform commission rate and track earnings</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchData}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 border-2 border-blue-100 bg-blue-50/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FiPercent className="h-5 w-5 text-blue-600" />
              </div>
              <Button size="sm" variant="outline" onClick={() => { setInputRate(String(rate)); setEditOpen(true) }} disabled={loading}>
                <FiEdit2 className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
            {loading ? (
              <div className="h-9 bg-slate-200 animate-pulse rounded" />
            ) : (
              <p className="text-3xl font-bold text-blue-700">{rate}%</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Current Commission Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
              <FiTrendingUp className="h-5 w-5 text-green-600" />
            </div>
            {loading ? (
              <div className="h-8 bg-slate-200 animate-pulse rounded w-24" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">{formatPrice(totals.total_commission)}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Total Commission Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
              <FiDollarSign className="h-5 w-5 text-amber-600" />
            </div>
            {loading ? (
              <div className="h-8 bg-slate-200 animate-pulse rounded w-24" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">{formatPrice(totals.pending_commission)}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Pending (Not Yet Released)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
              <FiDollarSign className="h-5 w-5 text-purple-600" />
            </div>
            {loading ? (
              <div className="h-8 bg-slate-200 animate-pulse rounded w-24" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">{formatPrice(totals.released_commission)}</p>
            )}
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
          {sellersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded" />
              ))}
            </div>
          ) : sellerCommissions.length === 0 ? (
            <p className="text-slate-400 text-sm py-6 text-center">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-3 text-slate-500 font-medium">Seller / Store</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Orders</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Total GMV</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Commission ({rate}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellerCommissions.map(seller => (
                    <tr key={seller.store_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3">
                        <p className="font-medium text-slate-800">{seller.store_name}</p>
                        <p className="text-xs text-slate-500">{seller.seller_name}</p>
                      </td>
                      <td className="py-3 text-slate-600">{seller.order_count}</td>
                      <td className="py-3 text-slate-800">{formatPrice(seller.total_gmv)}</td>
                      <td className="py-3 font-semibold text-green-700">{formatPrice(seller.total_commission)}</td>
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
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Rate'}
              </Button>
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
