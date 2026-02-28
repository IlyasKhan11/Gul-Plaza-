import { useState } from "react"
import { Wallet, Plus, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { mockWithdrawals, mockTransactions } from "@/data/mockData"
import { formatPrice, formatDate, generateId } from "@/lib/utils"
import type { WithdrawalRequest } from "@/types"

export function SellerWithdrawalsPage() {
  const { user } = useAuth()

  const [withdrawals, setWithdrawals] = useState(
    mockWithdrawals.filter((w) => w.sellerId === user?.id),
  )
  const [open, setOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  const [form, setForm] = useState({
    amount: "",
    method: "",
    accountNumber: "",
    accountName: "",
  })

  const myTransactions = mockTransactions.filter(
    (t) => t.sellerId === user?.id,
  )

  const available = myTransactions
    .filter((t) => t.status === "released")
    .reduce((s, t) => s + t.sellerShare, 0)

  const totalWithdrawn = withdrawals
    .filter((w) => w.status === "approved")
    .reduce((s, w) => s + w.amount, 0)

  function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    const newW: WithdrawalRequest = {
      id: generateId(),
      sellerId: user.id,
      storeName: user.name,
      amount: Number(form.amount),
      bankName: form.method, // use method for display
      accountNumber: form.accountNumber,
      accountName: form.accountName,
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
    }

    setWithdrawals((prev) => [newW, ...prev])
    setOpen(false)
    setForm({ amount: "", method: "", accountNumber: "", accountName: "" })
    setSuccessOpen(true)
  }

  const statusVariant = (s: string): "warning" | "success" | "destructive" => {
    if (s === "approved") return "success"
    if (s === "rejected") return "destructive"
    return "warning"
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Withdrawals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Request and track your withdrawals
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Request Withdrawal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Available</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {formatPrice(available)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Withdrawn</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {formatPrice(totalWithdrawn)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm">
              No withdrawal requests yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-3 text-slate-500 font-medium">
                      Method
                    </th>
                    <th className="text-left pb-3 text-slate-500 font-medium">
                      Account
                    </th>
                    <th className="text-left pb-3 text-slate-500 font-medium">
                      Status
                    </th>
                    <th className="text-left pb-3 text-slate-500 font-medium">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map((w) => (
                    <tr
                      key={w.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 text-slate-700">{w.bankName}</td>
                      <td className="py-3 text-slate-600 font-mono text-xs">
                        {w.accountNumber}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={statusVariant(w.status)}
                          className="capitalize"
                        >
                          {w.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-400 text-xs">
                        {formatDate(w.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Enter your method, account details & amount.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min={500}
                max={available}
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="method">Withdrawal Method *</Label>
              <select
                id="method"
                className="block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                value={form.method}
                onChange={(e) =>
                  setForm((f) => ({ ...f, method: e.target.value }))
                }
                required
              >
                <option value="">Select method</option>
                <option value="Bank">Bank</option>
                <option value="Mobile Wallet">Mobile Wallet</option>
              </select>
            </div>

            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                value={form.accountNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountNumber: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="accountName">Account Holder Name *</Label>
              <Input
                id="accountName"
                value={form.accountName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountName: e.target.value }))
                }
                required
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <DialogTitle>Requested!</DialogTitle>
            <p className="text-sm text-slate-500">
              Your withdrawal request was submitted.
            </p>
          </div>

          <DialogFooter className="justify-center">
            <Button onClick={() => setSuccessOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}