import { useState, useEffect, useCallback } from 'react'
import { FiRefreshCw, FiFlag, FiEdit2, FiDownload } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { adminService, type ApiReport } from '@/services/adminService'
import { formatDate } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
}

const REASON_LABELS: Record<string, string> = {
  inappropriate_content: 'Inappropriate Content',
  fake_product: 'Fake Product',
  misleading_description: 'Misleading Description',
  spam: 'Spam',
  copyright_violation: 'Copyright Violation',
  other: 'Other',
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    under_review: 'bg-blue-100 text-blue-700 border-blue-200',
    resolved: 'bg-green-100 text-green-700 border-green-200',
    dismissed: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] ?? colors.pending}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function AdminReportsPage() {
  const [reports, setReports] = useState<ApiReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReports, setTotalReports] = useState(0)

  const [actionReport, setActionReport] = useState<ApiReport | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: { page: number; limit: number; status?: string } = { page, limit: 20 }
      if (statusFilter !== 'all') params.status = statusFilter
      const data = await adminService.getReports(params)
      setReports(data.reports)
      setTotalPages(data.pagination.total_pages)
      setTotalReports(data.pagination.total_reports)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { fetchReports() }, [fetchReports])

  function openAction(report: ApiReport) {
    setActionReport(report)
    setNewStatus(report.status)
    setAdminNotes(report.admin_notes ?? '')
    setActionError(null)
  }

  async function handleSaveAction() {
    if (!actionReport) return
    setSaving(true)
    setActionError(null)
    try {
      await adminService.updateReportStatus(actionReport.id, newStatus, adminNotes || undefined)
      setReports(prev => prev.map(r =>
        r.id === actionReport.id ? { ...r, status: newStatus as ApiReport['status'], admin_notes: adminNotes || null } : r
      ))
      setActionReport(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update report')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Reports</h1>
          <p className="text-slate-500 text-sm mt-1">{totalReports} reports total</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FiDownload className="h-4 w-4 mr-1" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => adminService.exportReportsCSV(statusFilter === 'all' ? undefined : statusFilter)}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => adminService.exportReportsPDF(statusFilter === 'all' ? undefined : statusFilter)}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            <FiRefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchReports}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FiFlag className="h-4 w-4 text-red-500" />
            Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16">
              <FiFlag className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No reports found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-3 text-slate-500 font-medium">Product</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Reporter</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Reason</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Description</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Date</th>
                    <th className="text-right pb-3 text-slate-500 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map(report => (
                    <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3">
                        <p className="font-medium text-slate-800 truncate max-w-[160px]">{report.product_title}</p>
                        {report.store_name && (
                          <p className="text-xs text-slate-400 truncate max-w-[160px]">{report.store_name}</p>
                        )}
                      </td>
                      <td className="py-3">
                        <p className="text-slate-700 text-xs">{report.reporter_name}</p>
                        <p className="text-slate-400 text-xs">{report.reporter_email}</p>
                      </td>
                      <td className="py-3 text-slate-600 text-xs whitespace-nowrap">
                        {REASON_LABELS[report.reason] ?? report.reason}
                      </td>
                      <td className="py-3 text-slate-500 text-xs max-w-[180px]">
                        <span className="line-clamp-2">{report.description ?? '—'}</span>
                      </td>
                      <td className="py-3">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(report.created_at)}</td>
                      <td className="py-3">
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => openAction(report)}>
                            <FiEdit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
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
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={!!actionReport} onOpenChange={open => { if (!open) setActionReport(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Report Status</DialogTitle>
            <DialogDescription>
              Change the status and optionally add admin notes for this report.
            </DialogDescription>
          </DialogHeader>
          {actionReport && (
            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="font-medium text-slate-700">Product:</span> <span className="text-slate-600">{actionReport.product_title}</span></p>
                <p><span className="font-medium text-slate-700">Reason:</span> <span className="text-slate-600">{REASON_LABELS[actionReport.reason] ?? actionReport.reason}</span></p>
                {actionReport.description && (
                  <p><span className="font-medium text-slate-700">Description:</span> <span className="text-slate-600">{actionReport.description}</span></p>
                )}
              </div>
              <div>
                <Label htmlFor="rstatus">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rnotes">Admin Notes (optional)</Label>
                <textarea
                  id="rnotes"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this report..."
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              {actionError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{actionError}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionReport(null)}>Cancel</Button>
            <Button onClick={handleSaveAction} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
