import { useState } from 'react'
import { Pencil, CheckCircle, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'

export function BuyerProfilePage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', address: user?.address ?? '' })
  const [editOpen, setEditOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (user) Object.assign(user, form)
    setEditOpen(false)
    setSuccessOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your account information</p>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit Profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="text-xl">{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
              <p className="text-slate-500 text-sm mt-0.5">{user?.email}</p>
              <Badge variant="info" className="mt-1.5 capitalize">{user?.role}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Phone</p>
                <p className="font-medium text-slate-800 mt-0.5">{form.phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Delivery Address</p>
                <p className="font-medium text-slate-800 mt-0.5">{form.address || '—'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal information and delivery details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="pname">Full Name</Label>
              <Input id="pname" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="pphone">Phone Number</Label>
              <Input id="pphone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+92 3XX XXXXXXX" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="paddress">Delivery Address</Label>
              <Input id="paddress" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="House #, Street, City" className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
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
            <DialogTitle>Profile updated!</DialogTitle>
            <p className="text-sm text-slate-500">Your profile information has been saved successfully.</p>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setSuccessOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
