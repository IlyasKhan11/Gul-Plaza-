import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiX, FiCheckCircle, FiSearch, FiRefreshCw } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { sellerService, type SellerProduct, type ApiCategory } from '@/services/sellerService'
import { formatPrice } from '@/lib/utils'

const emptyForm = {
  title: '', description: '', price: '', stock: '', category_id: '',
}

export function SellerProductsPage() {
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editProduct, setEditProduct] = useState<SellerProduct | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchProducts = useCallback(async (p: number, q: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await sellerService.getProducts({ page: p, search: q, limit: 15 })
      setProducts(data.products)
      setTotalPages(data.pagination.total_pages)
      setTotalProducts(data.pagination.total_products)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts(1, '')
    sellerService.getCategories().then(setCategories).catch(() => {})
  }, [fetchProducts])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchProducts(1, search)
  }

  function changePage(newPage: number) {
    setPage(newPage)
    fetchProducts(newPage, search)
  }

  function openAdd() {
    setForm(emptyForm)
    setAddOpen(true)
  }

  function openEdit(product: SellerProduct) {
    setEditProduct(product)
    setForm({
      title: product.title,
      description: product.description,
      price: product.price,
      stock: String(product.stock),
      category_id: '',
    })
  }

  function closeForm() {
    setAddOpen(false)
    setEditProduct(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editProduct) {
        const updated = await sellerService.updateProduct(editProduct.id, {
          title: form.title,
          description: form.description,
          price: Number(form.price),
          stock: Number(form.stock),
          category_id: form.category_id ? Number(form.category_id) : undefined,
        })
        setProducts(prev => prev.map(p => p.id === editProduct.id ? updated : p))
        setSuccessMsg('Product updated successfully!')
      } else {
        const created = await sellerService.createProduct({
          title: form.title,
          description: form.description,
          price: Number(form.price),
          stock: Number(form.stock),
          category_id: Number(form.category_id),
        })
        setProducts(prev => [created, ...prev])
        setTotalProducts(t => t + 1)
        setSuccessMsg('Product added successfully!')
      }
      closeForm()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await sellerService.deleteProduct(deleteId)
      setProducts(prev => prev.filter(p => p.id !== deleteId))
      setTotalProducts(t => t - 1)
      setDeleteId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  const isFormOpen = addOpen || !!editProduct

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Products</h1>
          <p className="text-slate-500 text-sm mt-1">{totalProducts} products in your store</p>
        </div>
        <Button onClick={openAdd}>
          <FiPlus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchProducts(page, search)}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Product List</CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative w-48">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..." className="pl-9" />
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
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <FiPackage className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">No products found</p>
              <Button onClick={openAdd}>Add Your First Product</Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left pb-3 text-slate-500 font-medium">Product</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Category</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Price</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Stock</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                      <th className="text-right pb-3 text-slate-500 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {product.primary_image ? (
                              <img src={product.primary_image} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-50 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center">
                                <FiPackage className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                            <p className="font-medium text-slate-800 max-w-[180px] truncate">{product.title}</p>
                          </div>
                        </td>
                        <td className="py-3 text-slate-500 text-xs">{product.category_name ?? '—'}</td>
                        <td className="py-3 font-semibold text-slate-900">{formatPrice(parseFloat(product.price))}</td>
                        <td className="py-3">
                          <span className={product.stock < 10 ? 'text-red-600 font-medium' : 'text-slate-700'}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge variant={product.is_active && product.stock > 0 ? 'success' : 'destructive'}>
                            {!product.is_active ? 'Inactive' : product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                              <FiEdit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline"
                              className="text-red-500 hover:text-red-600 hover:border-red-300"
                              onClick={() => setDeleteId(product.id)}>
                              <FiTrash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Product Dialog */}
      <Dialog open={isFormOpen} onOpenChange={open => { if (!open) closeForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editProduct ? 'Update the product details below.' : 'Fill in the product details to add it to your store.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="ptitle">Product Name *</Label>
              <Input id="ptitle" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Enter product name" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="pdesc">Description *</Label>
              <Textarea id="pdesc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe your product..." className="mt-1" rows={3} required />
            </div>
            {categories.length > 0 && (
              <div>
                <Label htmlFor="pcat">Category {!editProduct && '*'}</Label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pprice">Price (Rs.) *</Label>
                <Input id="pprice" type="number" min="1" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. 5000" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="pstock">Stock Quantity *</Label>
                <Input id="pstock" type="number" min="0" value={form.stock}
                  onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                  placeholder="e.g. 50" className="mt-1" required />
              </div>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <FiX className="h-3 w-3" /> Product images can be added after creation via the product detail page.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editProduct ? 'Save Changes' : 'Add Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>Are you sure you want to delete this product? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!successMsg} onOpenChange={() => setSuccessMsg('')}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <FiCheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <DialogTitle>{successMsg}</DialogTitle>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setSuccessMsg('')}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
