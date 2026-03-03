import { useState, useEffect } from 'react'
import { FiSave, FiGlobe as StoreIcon, FiEdit2, FiCheckCircle, FiMail, FiPhone, FiPlusCircle, FiRefreshCw } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { sellerService, type SellerStore } from '@/services/sellerService'

const emptyForm = { store_name: '', description: '', logo_url: '', banner_url: '', contact_email: '', contact_phone: '' }

export function SellerStorePage() {
  const [store, setStore] = useState<SellerStore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successTitle, setSuccessTitle] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function loadProfile() {
    setLoading(true)
    setError(null)
    try {
      const data = await sellerService.getProfile()
      setStore(data.store)
      if (!data.store) setDialogOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfile() }, [])

  function openCreate() {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit() {
    if (!store) return
    setForm({
      store_name: store.name,
      description: store.description ?? '',
      logo_url: store.logo_url ?? '',
      banner_url: store.banner_url ?? '',
      contact_email: store.contact_email ?? '',
      contact_phone: store.contact_phone ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        store_name: form.store_name,
        description: form.description || undefined,
        logo_url: form.logo_url || undefined,
        banner_url: form.banner_url || undefined,
        contact_email: form.contact_email || undefined,
        contact_phone: form.contact_phone || undefined,
      }
      if (store) {
        const updated = await sellerService.updateStore(payload)
        setStore(updated)
        setSuccessTitle('Store Updated!')
        setSuccessMsg('Your store settings have been saved successfully.')
      } else {
        const created = await sellerService.createStore(payload)
        setStore(created)
        setSuccessTitle('Store Created!')
        setSuccessMsg('Your store has been submitted for admin approval. It will go live once approved.')
      }
      setDialogOpen(false)
      setSuccessOpen(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save store')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Store</h1>
          <p className="text-slate-500 text-sm mt-1">
            {store ? 'Manage your store profile' : 'Create your store to start selling'}
          </p>
        </div>
        {store && (
          <Button onClick={openCreate} variant="outline" size="sm">
            <FiPlusCircle className="h-4 w-4 mr-1" /> New Store
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={loadProfile}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      {!store ? (
        <Card className="border-2 border-dashed border-blue-200 bg-blue-50/40">
          <CardContent className="py-14 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <StoreIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">No store yet</h2>
              <p className="text-slate-500 text-sm mt-1">Create your store to list products and start receiving orders.</p>
            </div>
            <Button size="lg" onClick={openCreate}>
              <FiPlusCircle className="h-5 w-5 mr-1" /> Create My Store
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {store.banner_url && (
            <div className="h-28 w-full overflow-hidden bg-slate-100">
              <img src={store.banner_url} alt="" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {store.logo_url ? (
                <img src={store.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  <StoreIcon className="h-6 w-6 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">{store.name}</h3>
                  <Badge variant={store.is_approved ? 'success' : 'warning'}>
                    {store.is_approved ? 'Approved' : 'Pending Approval'}
                  </Badge>
                  {!store.is_active && <Badge variant="destructive">Inactive</Badge>}
                </div>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {store.description || 'No description added yet.'}
                </p>
                <div className="flex items-center gap-5 mt-2.5 text-xs text-slate-400">
                  {store.contact_email && (
                    <span className="flex items-center gap-1"><FiMail className="h-3 w-3" />{store.contact_email}</span>
                  )}
                  {store.contact_phone && (
                    <span className="flex items-center gap-1"><FiPhone className="h-3 w-3" />{store.contact_phone}</span>
                  )}
                  {store.city && <span>{store.city}</span>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={openEdit}>
                <FiEdit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open && !store) return; setDialogOpen(open) }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{store ? 'Edit Store' : 'Create New Store'}</DialogTitle>
            <DialogDescription>
              {store
                ? 'Update your store profile and contact information.'
                : 'Fill in your store details. Your store will be reviewed by admin before going live.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="sname">Store Name *</Label>
              <Input id="sname" value={form.store_name}
                onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))}
                placeholder="e.g. TechZone PK" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="sdesc">Description</Label>
              <Textarea id="sdesc" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Tell buyers what your store sells..." className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slogo">Logo URL</Label>
                <Input id="slogo" value={form.logo_url}
                  onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://..." className="mt-1" />
              </div>
              <div>
                <Label htmlFor="sbanner">Banner URL</Label>
                <Input id="sbanner" value={form.banner_url}
                  onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))}
                  placeholder="https://..." className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="semail">Contact Email</Label>
              <Input id="semail" type="email" value={form.contact_email}
                onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                placeholder="store@example.com" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="sphone">Contact Phone / WhatsApp *</Label>
              <Input id="sphone" value={form.contact_phone}
                onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                placeholder="923001234567" className="mt-1" required />
              <p className="text-xs text-slate-400 mt-1">Buyers will use this number to contact you.</p>
            </div>
            <DialogFooter>
              {store && (
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              )}
              <Button type="submit" disabled={saving}>
                <FiSave className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : store ? 'Save Changes' : 'Create Store'}
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
