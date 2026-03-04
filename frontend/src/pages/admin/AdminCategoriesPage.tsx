import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiTag } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { adminService, type ApiCategory } from '@/services/adminService'
import { formatDate } from '@/lib/utils'

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const emptyForm = { name: '', slug: '', parent_id: '' }

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<ApiCategory | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getCategories()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  function openAdd() {
    setEditCategory(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(cat: ApiCategory) {
    setEditCategory(cat)
    setForm({ name: cat.name, slug: cat.slug, parent_id: cat.parent_id ? String(cat.parent_id) : '' })
    setFormError(null)
    setFormOpen(true)
  }

  function handleNameChange(name: string) {
    setForm(f => ({
      ...f,
      name,
      slug: editCategory ? f.slug : toSlug(name),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Name is required'); return }
    if (!form.slug.trim()) { setFormError('Slug is required'); return }
    setSaving(true)
    setFormError(null)
    try {
      const parentId = form.parent_id ? Number(form.parent_id) : undefined
      if (editCategory) {
        const updated = await adminService.updateCategory(editCategory.id, {
          name: form.name,
          slug: form.slug,
          parent_id: parentId ?? null,
        })
        setCategories(prev => prev.map(c => c.id === editCategory.id ? updated : c))
      } else {
        const created = await adminService.createCategory({
          name: form.name,
          slug: form.slug,
          ...(parentId ? { parent_id: parentId } : {}),
        })
        setCategories(prev => [...prev, created])
      }
      setFormOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await adminService.deleteCategory(deleteId)
      setCategories(prev => prev.filter(c => c.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setDeleting(false)
    }
  }

  // Only top-level categories can be parents (no grandchildren)
  const parentOptions = categories.filter(c => c.parent_id === null && c.id !== editCategory?.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500 text-sm mt-1">{categories.length} categories</p>
        </div>
        <Button onClick={openAdd}>
          <FiPlus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchCategories}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Category List</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16">
              <FiTag className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-4">No categories yet</p>
              <Button onClick={openAdd}>Add First Category</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-3 text-slate-500 font-medium">Name</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Slug</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Parent</th>
                    <th className="text-left pb-3 text-slate-500 font-medium">Created</th>
                    <th className="text-right pb-3 text-slate-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map(cat => (
                    <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-medium text-slate-800">{cat.name}</td>
                      <td className="py-3 font-mono text-xs text-slate-500">{cat.slug}</td>
                      <td className="py-3 text-slate-500 text-xs">{cat.parent_name ?? '—'}</td>
                      <td className="py-3 text-slate-400 text-xs">{formatDate(cat.created_at)}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>
                            <FiEdit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-600 hover:border-red-300"
                            onClick={() => setDeleteId(cat.id)}
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={open => { if (!open) setFormOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editCategory ? 'Update the category details.' : 'Create a new product category.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="cname">Name *</Label>
              <Input
                id="cname"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Electronics"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="cslug">Slug *</Label>
              <Input
                id="cslug"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="e.g. electronics"
                className="mt-1 font-mono text-sm"
                required
              />
              <p className="text-xs text-slate-400 mt-1">URL-friendly identifier, auto-generated from name</p>
            </div>
            {parentOptions.length > 0 && (
              <div>
                <Label htmlFor="cparent">Parent Category (optional)</Label>
                <Select
                  value={form.parent_id}
                  onValueChange={v => setForm(f => ({ ...f, parent_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {parentOptions.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editCategory ? 'Save Changes' : 'Add Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure? This will fail if the category has products or subcategories assigned to it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
