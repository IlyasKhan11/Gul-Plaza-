import { useState } from 'react'
import { Save, Store as StoreIcon, Pencil, CheckCircle, Mail, Phone, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { mockStores } from '@/data/mockData'
import { generateId } from '@/lib/utils'
import type { Store } from '@/types'

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const emptyForm = { name: '', description: '', logo: '', banner: '', contactEmail: '', whatsapp: '' }

export function SellerStorePage() {
  const { user } = useAuth()
  const [stores, setStores] = useState<Store[]>(mockStores.filter(s => s.sellerId === user?.id))
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [dialogOpen, setDialogOpen] = useState(stores.length === 0)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successTitle, setSuccessTitle] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  function openCreate() {
    setEditingStore(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(store: Store) {
    setEditingStore(store)
    setForm({
      name: store.name,
      description: store.description,
      logo: store.logo,
      banner: store.banner,
      contactEmail: store.contactEmail,
      whatsapp: store.whatsapp,
    })
    setDialogOpen(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    if (editingStore) {
      Object.assign(editingStore, {
        name: form.name,
        description: form.description,
        logo: form.logo,
        banner: form.banner,
        contactEmail: form.contactEmail,
        whatsapp: form.whatsapp,
        slug: toSlug(form.name),
      })
      setStores([...mockStores.filter(s => s.sellerId === user.id)])
      setSuccessTitle('Store Updated!')
      setSuccessMsg('Your store settings have been saved successfully.')
    } else {
      const newStore: Store = {
        id: generateId(),
        sellerId: user.id,
        sellerName: user.name,
        name: form.name,
        slug: toSlug(form.name),
        description: form.description,
        logo: form.logo,
        banner: form.banner,
        contactEmail: form.contactEmail,
        whatsapp: form.whatsapp,
        rating: 0,
        reviewCount: 0,
        productCount: 0,
        isApproved: false,
        isBlocked: false,
        createdAt: new Date().toISOString().split('T')[0],
      }
      mockStores.push(newStore)
      setStores([...mockStores.filter(s => s.sellerId === user.id)])
      setSuccessTitle('Store Created!')
      setSuccessMsg('Your store has been submitted for admin approval. It will go live once approved.')
    }

    setDialogOpen(false)
    setSuccessOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Stores</h1>
          <p className="text-slate-500 text-sm mt-1">
            {stores.length === 0
              ? 'Create your first store to start selling'
              : `You have ${stores.length} store${stores.length > 1 ? 's' : ''}`}
          </p>
        </div>
        {stores.length > 0 && (
          <Button onClick={openCreate}>
            <PlusCircle className="h-4 w-4" /> Add New Store
          </Button>
        )}
      </div>

      {/* No stores — prominent CTA */}
      {stores.length === 0 && (
        <Card className="border-2 border-dashed border-blue-200 bg-blue-50/40">
          <CardContent className="py-14 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <StoreIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">No stores yet</h2>
              <p className="text-slate-500 text-sm mt-1">
                Create your store to list products and start receiving orders.
              </p>
            </div>
            <Button size="lg" onClick={openCreate}>
              <PlusCircle className="h-5 w-5" /> Create My First Store
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Store list */}
      <div className="grid gap-4">
        {stores.map(store => (
          <Card key={store.id} className="overflow-hidden">
            {store.banner && (
              <div className="h-24 w-full overflow-hidden bg-slate-100">
                <img
                  src={store.banner}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 -mt-8 relative z-10 bg-white"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <StoreIcon className="h-6 w-6 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-base">{store.name}</h3>
                    {store.isApproved
                      ? <Badge variant="success">Approved</Badge>
                      : <Badge variant="warning">Pending Approval</Badge>
                    }
                    {store.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                    {store.description || 'No description added yet.'}
                  </p>
                  <div className="flex items-center gap-5 mt-2.5 text-xs text-slate-400">
                    {store.contactEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />{store.contactEmail}
                      </span>
                    )}
                    {store.whatsapp && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />+{store.whatsapp}
                      </span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(store)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          if (!open && stores.length === 0) return // block closing when no stores exist
          setDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStore ? 'Edit Store' : 'Create New Store'}</DialogTitle>
            <DialogDescription>
              {editingStore
                ? 'Update your store profile and contact information.'
                : 'Fill in your store details. Your store will be reviewed by admin before going live.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="sname">Store Name *</Label>
              <Input
                id="sname"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. TechZone PK"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="sdesc">Store Description</Label>
              <Textarea
                id="sdesc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
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
                  value={form.logo}
                  onChange={e => setForm(f => ({ ...f, logo: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sbanner">Banner URL</Label>
                <Input
                  id="sbanner"
                  value={form.banner}
                  onChange={e => setForm(f => ({ ...f, banner: e.target.value }))}
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
                value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                placeholder="store@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="swa">WhatsApp Number *</Label>
              <Input
                id="swa"
                value={form.whatsapp}
                onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                placeholder="923001234567 (with country code, no +)"
                className="mt-1"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                Buyers will contact you on this number for orders and payments.
              </p>
            </div>
            <DialogFooter>
              {(editingStore || stores.length > 0) && (
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              )}
              <Button type="submit">
                <Save className="h-4 w-4" />
                {editingStore ? 'Save Changes' : 'Create Store'}
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
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <DialogTitle>{successTitle}</DialogTitle>
            <p className="text-sm text-slate-500">{successMsg}</p>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setSuccessOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
