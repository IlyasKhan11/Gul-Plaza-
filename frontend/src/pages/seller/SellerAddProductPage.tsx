import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, X, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockCategories, mockProducts, mockStores } from '@/data/mockData'
import { useAuth } from '@/context/AuthContext'
import { generateId } from '@/lib/utils'
import type { Product } from '@/types'

export function SellerAddProductPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stock, setStock] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  const sellerStores = mockStores.filter(s => s.sellerId === user?.id)
  const [selectedStoreId, setSelectedStoreId] = useState(sellerStores[0]?.id ?? '')
  const store = sellerStores.find(s => s.id === selectedStoreId) ?? sellerStores[0]

  function addImage() {
    if (imageUrl.trim()) {
      setImages(prev => [...prev, imageUrl.trim()])
      setImageUrl('')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const category = mockCategories.find(c => c.id === categoryId)
    if (!category || !user || !store) return

    const newProduct: Product = {
      id: generateId(),
      storeId: store.id,
      storeName: store.name,
      sellerId: user.id,
      name,
      description,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category: category.name,
      categoryId,
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop'],
      stock: Number(stock),
      rating: 0,
      reviewCount: 0,
      isFeatured: false,
      createdAt: new Date().toISOString().split('T')[0],
    }

    mockProducts.push(newProduct)
    setSuccess(true)
    setTimeout(() => navigate('/seller/products'), 1500)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/seller/products"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add New Product</h1>
          <p className="text-slate-500 text-sm mt-0.5">Fill in the product details below</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm font-medium">
          ✓ Product added successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {sellerStores.length > 1 && (
              <div>
                <Label htmlFor="store">Store *</Label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellerStores.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter product name" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="desc">Description *</Label>
              <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your product..." className="mt-1" rows={4} required />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pricing & Stock</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Sale Price (Rs.) *</Label>
                <Input id="price" type="number" min="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 5000" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="origprice">Original Price (Rs.)</Label>
                <Input id="origprice" type="number" min="1" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="e.g. 6500" className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input id="stock" type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} placeholder="e.g. 50" className="mt-1" required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Product Images</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste image URL..." />
              <Button type="button" variant="outline" onClick={addImage}><Plus className="h-4 w-4" /></Button>
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="" className="w-20 h-20 rounded-lg object-cover border border-slate-200" />
                    <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400">Add image URLs (from Unsplash or your server). If none added, a placeholder will be used.</p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1">Add Product</Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/seller/products">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
