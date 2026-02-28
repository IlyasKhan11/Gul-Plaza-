import { useParams, Link } from 'react-router-dom'
import { MessageCircle, Package, Star, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductCard } from '@/components/common/ProductCard'
import { mockStores, mockProducts } from '@/data/mockData'

export function StorePage() {
  const { id } = useParams()
  const store = mockStores.find(s => s.id === id)

  if (!store) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <p className="text-xl text-slate-400">Store not found</p>
      <Button className="mt-4" asChild><Link to="/">Go Home</Link></Button>
    </div>
  )

  const products = mockProducts.filter(p => p.storeId === store.id)
  const whatsappUrl = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Hi! I found your store on Gul Plaza and I'd like to know more.`)}`

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700">
        {store.banner && (
          <img src={store.banner} alt={store.name} className="w-full h-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Store Header */}
        <div className="relative -mt-12 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <img
              src={store.logo}
              alt={store.name}
              className="w-20 h-20 rounded-xl border-4 border-white shadow-md bg-white"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{store.name}</h1>
                <Badge variant="success">Verified</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-slate-700">{store.rating}</span>
                  <span>({store.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span>{store.productCount} products</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>Pakistan</span>
                </div>
              </div>
              <p className="mt-2 text-slate-600 text-sm max-w-xl">{store.description}</p>
            </div>
            <Button
              className="border-green-500 text-green-700 hover:bg-green-50 shrink-0"
              variant="outline"
              onClick={() => window.open(whatsappUrl, '_blank')}
            >
              <MessageCircle className="h-4 w-4" />
              Contact on WhatsApp
            </Button>
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
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
