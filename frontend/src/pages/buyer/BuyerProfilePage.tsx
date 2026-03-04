import { useState } from 'react'
import { FiEdit2, FiCheckCircle, FiPhone, FiMapPin, FiGlobe, FiClock } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { mockStores } from '@/data/mockData'
import { generateId } from '@/lib/utils'
import type { Store } from '@/types'

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const emptyStoreForm = { name: '', description: '', logo: '', banner: '', contactEmail: '', whatsapp: '' }

export function BuyerProfilePage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone && !user?.phone.includes('*') ? user.phone : '', address: user?.address ?? '' })
  const [editOpen, setEditOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  // Seller application state
  const [sellerFormOpen, setSellerFormOpen] = useState(false)
  const [storeForm, setStoreForm] = useState(emptyStoreForm)
  const [submitting, setSubmitting] = useState(false)
  const [pendingStore, setPendingStore] = useState<Store | null>(
    () => mockStores.find(s => s.sellerId === user?.id) ?? null
  )
  const [appliedOpen, setAppliedOpen] = useState(false)

  const { setUser } = useAuth() as any
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      // Only send real phone number, not masked
      const payload = { ...form, phone: form.phone }
      if (!payload.phone || payload.phone.includes('*')) {
        alert('Please enter your real phone number.');
        return;
      }
      const updated = await import('@/services/authService').then(m => m.authService.updateUserProfile(payload))
      setUser(updated.user)
      localStorage.setItem('gul_plaza_user', JSON.stringify(updated.user))
      setEditOpen(false)
      setSuccessOpen(true)
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }

  function handleStoreSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)

    const newStore: Store = {
      id: generateId(),
      sellerId: user.id,
      sellerName: user.name,
      name: storeForm.name,
      slug: toSlug(storeForm.name),
      description: storeForm.description,
      logo: storeForm.logo,
      banner: storeForm.banner,
      contactEmail: storeForm.contactEmail,
      whatsapp: storeForm.whatsapp,
      rating: 0,
      reviewCount: 0,
      productCount: 0,
      isApproved: false,
      isBlocked: false,
      createdAt: new Date().toISOString().split('T')[0],
    }

    mockStores.push(newStore)
    setPendingStore(newStore)
    setStoreForm(emptyStoreForm)
    setSubmitting(false)
    setSellerFormOpen(false)
    setAppliedOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your account information</p>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <FiEdit2 className="h-4 w-4" /> Edit Profile
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
              <FiPhone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Phone</p>
                <p className="font-medium text-slate-800 mt-0.5">{form.phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiMapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
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

      {/* Become a Seller — or Pending Approval banner */}
      {pendingStore ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <FiClock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Seller Application Pending</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Your store <span className="font-medium text-slate-700">"{pendingStore.name}"</span> has been submitted and is awaiting admin approval. You'll be notified once it's reviewed.
              </p>
            </div>
            <Badge variant="warning" className="shrink-0 ml-auto">Pending</Badge>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="flex items-center justify-between gap-4 py-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <FiGlobe className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Want to sell on Gul Plaza?</p>
                <p className="text-xs text-slate-500 mt-0.5">Set up your store and submit it for admin approval to start selling.</p>
              </div>
            </div>
            <Button onClick={() => setSellerFormOpen(true)} className="shrink-0">
              Become a Seller
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Seller Application Form Dialog */}
      <Dialog open={sellerFormOpen} onOpenChange={setSellerFormOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Up Your Store</DialogTitle>
            <DialogDescription>
              Fill in your store details below. Your application will be reviewed by an admin before your store goes live.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStoreSubmit} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="sname">Store Name *</Label>
              <Input
                id="sname"
                value={storeForm.name}
                onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. TechZone PK"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="sdesc">Store Description</Label>
              <Textarea
                id="sdesc"
                value={storeForm.description}
                onChange={e => setStoreForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Tell buyers what your store sells..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slogo">Logo URL</Label>
                <Input
                  id="slogo"
                  value={storeForm.logo}
                  onChange={e => setStoreForm(f => ({ ...f, logo: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sbanner">Banner URL</Label>
                <Input
                  id="sbanner"
                  value={storeForm.banner}
                  onChange={e => setStoreForm(f => ({ ...f, banner: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="semail">Contact Email</Label>
              <Input
                id="semail"
                type="email"
                value={storeForm.contactEmail}
                onChange={e => setStoreForm(f => ({ ...f, contactEmail: e.target.value }))}
                placeholder="store@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="swa">WhatsApp Number *</Label>
              <Input
                id="swa"
                value={storeForm.whatsapp}
                onChange={e => setStoreForm(f => ({ ...f, whatsapp: e.target.value }))}
                placeholder="923001234567 (with country code, no +)"
                className="mt-1"
                required
              />
              <p className="text-xs text-slate-400 mt-1">Buyers will contact you on this number for orders and payments.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSellerFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Application Submitted Success Dialog */}
      <Dialog open={appliedOpen} onOpenChange={setAppliedOpen}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <FiClock className="h-7 w-7 text-amber-600" />
            </div>
            <DialogTitle>Application Submitted!</DialogTitle>
            <p className="text-sm text-slate-500">Your store has been submitted for review. An admin will approve it shortly — you'll be able to start selling once approved.</p>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setAppliedOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Update Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <FiCheckCircle className="h-7 w-7 text-green-600" />
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
