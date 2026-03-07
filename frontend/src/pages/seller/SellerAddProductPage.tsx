import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiX, FiChevronLeft, FiImage, FiUpload, FiClock } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { sellerService, type SellerStore, type ApiCategory } from '@/services/sellerService'

export function SellerAddProductPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stock, setStock] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Real data from API
  const [sellerStore, setSellerStore] = useState<SellerStore | null>(null)
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const profileRes = await sellerService.getProfile()
        if (profileRes.store) {
          setSellerStore(profileRes.store)
        }
        const categoriesRes = await sellerService.getCategories()
        setCategories(categoriesRes)
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImage(true)
    setError('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const url = await sellerService.uploadProductImage(file)
        uploaded.push(url)
      }
      setImages(prev => [...prev, ...uploaded])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !price || !categoryId || !stock) {
      setError('Please fill in all required fields')
      return
    }

    if (!sellerStore) {
      setError('You need a store to add products')
      return
    }

    setLoading(true)
    try {
      await sellerService.createProduct({
        title: name,
        description,
        price: Number(price),
        stock: Number(stock),
        category_id: Number(categoryId),
        images: images.length > 0 ? images : [],
      })
      setSuccess(true)
      setTimeout(() => navigate('/seller/products'), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!sellerStore) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/seller/products"><FiChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Add New Product</h1>
            <p className="text-slate-500 text-sm mt-0.5">Fill in the product details below</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-slate-500 mb-4">You need to create a store first before adding products.</p>
            <Button asChild>
              <Link to="/seller/store">Create Store</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sellerStore.is_active) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/seller/products"><FiChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Add New Product</h1>
            <p className="text-slate-500 text-sm mt-0.5">Fill in the product details below</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <FiClock className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Store Pending Approval</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                Your store <span className="font-medium text-slate-700">"{sellerStore.name}"</span> is currently under review.
                You will be able to add products once an admin approves your store.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/seller/store">View Store Details</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/seller/products"><FiChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add New Product</h1>
          <p className="text-slate-500 text-sm mt-0.5">Fill in the product details below</p>
        </div>
      </div>

      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <p className="text-green-700 font-medium">✓ Product created successfully! Redirecting...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="Enter product name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter product description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Original Price</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  placeholder="0.00"
                  value={originalPrice}
                  onChange={e => setOriginalPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="0"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Product Images</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? (
                  <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiUpload className="h-6 w-6 text-slate-400" />
                )}
                <span className="text-sm text-slate-500">
                  {uploadingImage ? 'Uploading…' : 'Click to upload images (JPG, PNG, WEBP — max 5MB each)'}
                </span>
              </button>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      {img ? (
                        <img
                          src={img}
                          alt={`Product ${idx + 1}`}
                          className="h-20 w-20 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                          <FiImage className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FiX className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" asChild>
            <Link to="/seller/products">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading || uploadingImage}>
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}
