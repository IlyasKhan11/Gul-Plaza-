import { useState } from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { mockUsers } from '@/data/mockData'
import { formatDate } from '@/lib/utils'
import type { User } from '@/types'

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers.filter(u => u.role !== 'admin'))
  const [search, setSearch] = useState('')

  const filtered = search ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search)) : users

  function toggleBlock(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isBlocked: !u.isBlocked } : u))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 text-sm mt-1">{users.length} registered users</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">User Management</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left pb-3 text-slate-500 font-medium">User</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Role</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Joined</th>
                  <th className="text-right pb-3 text-slate-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant={user.role === 'seller' ? 'info' : 'secondary'} className="capitalize">{user.role}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={user.isBlocked ? 'destructive' : 'success'}>{user.isBlocked ? 'Blocked' : 'Active'}</Badge>
                    </td>
                    <td className="py-3 text-slate-500 text-xs">{formatDate(user.createdAt)}</td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        variant={user.isBlocked ? 'outline' : 'outline'}
                        className={user.isBlocked ? 'text-green-600 border-green-300 hover:bg-green-50' : 'text-red-500 border-red-200 hover:bg-red-50'}
                        onClick={() => toggleBlock(user.id)}
                      >
                        {user.isBlocked ? 'Unblock' : 'Block'}
                      </Button>
                    </td>
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
