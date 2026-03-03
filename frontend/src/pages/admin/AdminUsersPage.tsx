import { useState, useEffect, useCallback } from 'react'
import { FiSearch, FiRefreshCw } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { adminService, type ApiUser } from '@/services/adminService'
import { formatDate } from '@/lib/utils'

export function AdminUsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getUsers({ page: p, search: q, limit: 15 })
      setUsers(data.users.filter(u => u.role !== 'admin'))
      setTotalPages(data.pagination.total_pages)
      setTotalUsers(data.pagination.total_users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers(1, '') }, [fetchUsers])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchUsers(1, search)
  }

  async function toggleBlock(user: ApiUser) {
    setActionLoading(user.id)
    try {
      if (user.is_blocked) {
        await adminService.unblockUser(user.id)
      } else {
        await adminService.blockUser(user.id)
      }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_blocked: !u.is_blocked } : u))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  function changePage(newPage: number) {
    setPage(newPage)
    fetchUsers(newPage, search)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 text-sm mt-1">{totalUsers} registered users</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchUsers(page, search)}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">User Management</CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative w-56">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9"
                />
              </div>
              <Button type="submit" size="sm">Search</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">No users found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left pb-3 text-slate-500 font-medium">User</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Role</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Store</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Joined</th>
                      <th className="text-right pb-3 text-slate-500 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{user.name[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-800">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge variant={user.role === 'seller' ? 'info' : 'secondary'} className="capitalize">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-3 text-xs text-slate-500">
                          {user.has_store ? user.store_name : '—'}
                        </td>
                        <td className="py-3">
                          <Badge variant={user.is_blocked ? 'destructive' : 'success'}>
                            {user.is_blocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-500 text-xs">{formatDate(user.created_at)}</td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading === user.id}
                            className={
                              user.is_blocked
                                ? 'text-green-600 border-green-300 hover:bg-green-50'
                                : 'text-red-500 border-red-200 hover:bg-red-50'
                            }
                            onClick={() => toggleBlock(user)}
                          >
                            {actionLoading === user.id ? (
                              <span className="flex items-center gap-1">
                                <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                {user.is_blocked ? 'Unblocking…' : 'Blocking…'}
                              </span>
                            ) : (
                              user.is_blocked ? 'Unblock' : 'Block'
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
