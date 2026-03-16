import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { FiMessageCircle, FiPackage, FiMapPin } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductCard } from '@/components/common/ProductCard'
import { api } from '@/lib/api'
import type { Product } from '@/types'

interface StoreDetail {
  id: number
  owner_id: number
  name: string
  logo_url: string | null
  banner_url: string | null
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  city: string | null
  country: string | null
  product_count: number
}

export function StorePage() {
  const { id } = useParams()
  const [store, setStore] = useState<StoreDetail | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<{ success: boolean; data: StoreDetail }>(`/api/sellers/stores/${id}`)
      .then(res => {
        if (res.success) {
          setStore(res.data)
          return api.get<{ data: { products: Product[] } }>(`/api/products?store_id=${res.data.id}&limit=40`)
        }
        setNotFound(true)
      })
      .then(res => { if (res) setProducts(res.data.products) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading...</div>
  )

  if (notFound || !store) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <p className="text-xl text-slate-400">Store not found</p>
      <Button className="mt-4" asChild><Link to="/">Go Home</Link></Button>
    </div>
  )

  const whatsappUrl = store.contact_phone
    ? `https://wa.me/${store.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent("Hi! I found your store on Gul Plaza and I'd like to know more.")}`
    : null

  const location = [store.city, store.country].filter(Boolean).join(', ') || 'Pakistan'

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700">
        {store.banner_url && (
          <img src={store.banner_url} alt={store.name} className="w-full h-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Store Header */}
        <div className="relative -mt-12 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <img
              src={store.logo_url || '/default-store-logo.png'}
              alt={store.name}
              className="w-20 h-20 rounded-xl border-4 border-white shadow-md bg-white object-cover"
              onError={e => { e.currentTarget.src = '/default-store-logo.png' }}
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{store.name}</h1>
                <Badge variant="success">Verified</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                <div className="flex items-center gap-1">
                  <FiPackage className="h-4 w-4" />
                  <span>{store.product_count} products</span>
                </div>
                <div className="flex items-center gap-1">
                  <FiMapPin className="h-4 w-4" />
                  <span>{location}</span>
                </div>
              </div>
              {store.description && (
                <p className="mt-2 text-slate-600 text-sm max-w-xl">{store.description}</p>
              )}
            </div>
            {whatsappUrl && (
              <Button
                className="border-green-500 text-green-700 hover:bg-green-50 shrink-0"
                variant="outline"
                onClick={() => window.open(whatsappUrl, '_blank')}
              >
                <FiMessageCircle className="h-4 w-4" />
                Contact on WhatsApp
              </Button>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="pb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-5">Products ({products.length})</h2>
          {products.length === 0 ? (
            <p className="text-slate-400 text-center py-12">No products yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <ProductCard key={product.id} product={{
                  ...product,
                  name: product.title,
                  category: (product as any).category_name ?? product.category,
                  images: product.images?.length ? product.images : product.primary_image ? [product.primary_image] : [],
                  price: Number(product.price),
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
