import { useState, useEffect, useCallback } from 'react'
import { FiSearch, FiRefreshCw, FiShield } from 'react-icons/fi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { adminService, type ApiSeller } from '@/services/adminService'
import { AlertModal } from '@/components/ui/alert-modal'
import { formatDate } from '@/lib/utils'

export function AdminSellersPage() {
  const [sellers, setSellers] = useState<ApiSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSellers, setTotalSellers] = useState(0)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [alertMsg, setAlertMsg] = useState('')

  const fetchSellers = useCallback(async (p: number, q: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getSellers({ page: p, search: q })
      setSellers(data.sellers)
      setTotalPages(data.pagination.total_pages)
      setTotalSellers(data.pagination.total_sellers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sellers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSellers(1, '') }, [fetchSellers])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchSellers(1, search)
  }

  async function toggleBlock(seller: ApiSeller) {
    setActionLoading(seller.id)
    try {
      if (seller.is_blocked) {
        await adminService.unblockUser(seller.id)
      } else {
        await adminService.blockUser(seller.id)
      }
      setSellers(prev =>
        prev.map(s => s.id === seller.id ? { ...s, is_blocked: !s.is_blocked } : s)
      )
    } catch (err) {
      setAlertMsg(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  function changePage(newPage: number) {
    setPage(newPage)
    fetchSellers(newPage, search)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sellers</h1>
          <p className="text-slate-500 text-sm mt-1">{totalSellers} registered sellers</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative w-56">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sellers..."
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm">Search</Button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchSellers(page, search)}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sellers.length === 0 ? (
        <p className="text-center text-slate-400 py-12 text-sm">No sellers found</p>
      ) : (
        <>
          <div className="space-y-4">
            {sellers.map(seller => (
              <Card key={seller.id} className={seller.is_blocked ? 'opacity-60' : ''}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400 shrink-0">
                      {seller.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900">{seller.store_name ?? seller.username}</h3>
                        {seller.has_store && <Badge variant="success">Has Store</Badge>}
                        {seller.is_blocked && <Badge variant="destructive">Blocked</Badge>}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{seller.username} · {seller.email}</p>
                      {seller.phone && <p className="text-xs text-slate-400">{seller.phone}</p>}
                      <p className="text-xs text-slate-500 mt-1">Joined {formatDate(seller.created_at)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === seller.id}
                        className={
                          seller.is_blocked
                            ? 'text-green-600 border-green-300 hover:bg-green-50'
                            : 'text-red-500 border-red-200 hover:bg-red-50'
                        }
                        onClick={() => toggleBlock(seller)}
                      >
                        {actionLoading === seller.id ? (
                          <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <><FiShield className="h-4 w-4 mr-1" />{seller.is_blocked ? 'Unblock' : 'Block'}</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
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
        </>
      )}
      <AlertModal open={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg('')} />
    </div>
  )
}
