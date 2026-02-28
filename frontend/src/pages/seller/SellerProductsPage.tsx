import { useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiX, FiCheckCircle } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { mockProducts, mockCategories, mockStores } from '@/data/mockData'
import { formatPrice, generateId } from '@/lib/utils'
import type { Product } from '@/types'

const emptyForm = {
  name: '', description: '', price: '', originalPrice: '',
  categoryId: '', stock: '', imageUrl: '', images: [] as string[],
}

export function SellerProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState(mockProducts.filter(p => p.sellerId === user?.id))
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [successMsg, setSuccessMsg] = useState('')

  const store = mockStores.find(s => s.sellerId === user?.id)

  function openAdd() {
    setForm(emptyForm)
    setAddOpen(true)
  }

  function openEdit(product: Product) {
    setEditProduct(product)
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      originalPrice: String(product.originalPrice ?? ''),
      categoryId: product.categoryId,
      stock: String(product.stock),
      imageUrl: '',
      images: [...product.images],
    })
  }

  function closeForm() {
    setAddOpen(false)
    setEditProduct(null)
    setForm(emptyForm)
  }

  function addImage() {
    if (form.imageUrl.trim()) {
      setForm(f => ({ ...f, images: [...f.images, f.imageUrl.trim()], imageUrl: '' }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const category = mockCategories.find(c => c.id === form.categoryId)
    if (!category || !user || !store) return

    if (editProduct) {
      Object.assign(editProduct, {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        category: category.name,
        categoryId: form.categoryId,
        images: form.images.length > 0 ? form.images : editProduct.images,
        stock: Number(form.stock),
      })
      setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...editProduct } : p))
      setSuccessMsg('Product updated successfully!')
    } else {
      const newProduct: Product = {
        id: generateId(),
        storeId: store.id,
        storeName: store.name,
        sellerId: user.id,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        category: category.name,
        categoryId: form.categoryId,
        images: form.images.length > 0 ? form.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop'],
        stock: Number(form.stock),
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        createdAt: new Date().toISOString().split('T')[0],
      }
      mockProducts.push(newProduct)
      setProducts(prev => [...prev, newProduct])
      setSuccessMsg('Product added successfully!')
    }
    closeForm()
  }

  function confirmDelete() {
    if (deleteId) {
      setProducts(prev => prev.filter(p => p.id !== deleteId))
      setDeleteId(null)
    }
  }

  const isFormOpen = addOpen || !!editProduct

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Products</h1>
          <p className="text-slate-500 text-sm mt-1">{products.length} products in your store</p>
        </div>
        <Button onClick={openAdd}>
          <FiPlus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product List</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-16">
              <FiPackage className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">You haven't added any products yet</p>
              <Button onClick={openAdd}>Add Your First Product</Button>
            </div>
          ) : (
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
                          <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-slate-50" />
                          <div>
                            <p className="font-medium text-slate-800 max-w-[180px] truncate">{product.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {[1,2,3,4,5].map(s => (
                                <span key={s} className={`text-xs ${s <= Math.round(product.rating) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                              ))}
                              <span className="text-xs text-slate-400">({product.reviewCount})</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">{product.category}</td>
                      <td className="py-3 font-semibold text-slate-900">{formatPrice(product.price)}</td>
                      <td className="py-3">
                        <span className={product.stock < 10 ? 'text-red-600 font-medium' : 'text-slate-700'}>{product.stock}</span>
                      </td>
                      <td className="py-3">
                        <Badge variant={product.stock > 0 ? 'success' : 'destructive'}>
                          {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:border-red-300" onClick={() => setDeleteId(product.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add / Edit Product Dialog */}
      <Dialog open={isFormOpen} onOpenChange={open => { if (!open) closeForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editProduct ? 'Update the product details below.' : 'Fill in the product details to add it to your store.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">Basic Information</p>
              <div>
                <Label htmlFor="pname">Product Name *</Label>
                <Input id="pname" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter product name" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="pdesc">Description *</Label>
                <Textarea id="pdesc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your product..." className="mt-1" rows={3} required />
              </div>
              <div>
                <Label htmlFor="pcat">Category *</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">Pricing & Stock</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pprice">Sale Price (Rs.) *</Label>
                  <Input id="pprice" type="number" min="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 5000" className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="porigprice">Original Price (Rs.)</Label>
                  <Input id="porigprice" type="number" min="1" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} placeholder="e.g. 6500" className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="pstock">Stock Quantity *</Label>
                <Input id="pstock" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="e.g. 50" className="mt-1" required />
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">Product Images</p>
              <div className="flex gap-2">
                <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="Paste image URL..." />
                <Button type="button" variant="outline" onClick={addImage}><Plus className="h-4 w-4" /></Button>
              </div>
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                      <button type="button" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400">Add image URLs. If none added, a placeholder will be used.</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit">{editProduct ? 'FiSave Changes' : 'Add Product'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>Are you sure you want to delete this product? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!successMsg} onOpenChange={() => setSuccessMsg('')}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <DialogTitle>{successMsg}</DialogTitle>
            <p className="text-sm text-slate-500">Your product list has been updated.</p>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setSuccessMsg('')}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
