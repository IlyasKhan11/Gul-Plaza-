import { Link } from 'react-router-dom'
import { FiArrowRight, FiShield, FiTruck, FiHeadphones, FiStar } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/common/ProductCard'
import { ProductCardSkeleton } from '@/components/common/ProductCardSkeleton'
import { StoreCard } from '@/components/common/StoreCard'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { Product } from '@/types'

interface ApiCategory {
  id: number
  name: string
  slug: string
  parent_id: number | null
  sample_image: string | null
}

interface ApiStore {
  id: number
  owner_id: number
  name: string
  logo_url: string | null
  banner_url: string | null
  description: string | null
  product_count: number
}

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '📱',
  fashion: '👗',
  clothing: '👕',
  'home-living': '🏠',
  home: '🏠',
  books: '📚',
  sports: '⚽',
  beauty: '💄',
  groceries: '🛒',
  food: '🛒',
  toys: '🧸',
  automotive: '🚗',
  health: '💊',
  jewelry: '💍',
  furniture: '🛋️',
  garden: '🌱',
  music: '🎵',
  tools: '🔧',
  baby: '👶',
  pets: '🐾',
}

function getCategoryIcon(name: string, slug: string): string {
  const key = slug.toLowerCase()
  if (CATEGORY_ICONS[key]) return CATEGORY_ICONS[key]
  const nameKey = name.toLowerCase().replace(/\s+/g, '-')
  if (CATEGORY_ICONS[nameKey]) return CATEGORY_ICONS[nameKey]
  // partial match
  for (const [k, icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k) || k.includes(key.split('-')[0])) return icon
  }
  return '🏷️'
}

export function HomePage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [stores, setStores] = useState<ApiStore[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get<{ data: { products: Product[] } }>('/api/products?page=1&limit=40')
      .then(res => {
        setProducts(res.data.products)
      })
      .catch(() => {
        setProducts([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api.get<{ success: boolean; data: ApiCategory[] }>('/api/categories')
      .then(res => {
        if (res.success && res.data.length > 0) {
          setCategories(res.data.filter(c => c.parent_id === null))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.get<{ success: boolean; data: ApiStore[] }>('/api/sellers/stores?limit=6')
      .then(res => { if (res.success) setStores(res.data) })
      .catch(() => {})
  }, [])

  const featuredProducts = products.slice(0, 8)
  const moreProducts = products.slice(8)

  return (
    <div className="space-y-0">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-sm backdrop-blur-sm">
                <FiStar className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-blue-100 font-medium">Pakistan's Trusted Marketplace</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                Shop Everything,<br />
                <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  All in One Place
                </span>
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed max-w-md">
                Browse thousands of products from verified sellers. Best prices, genuine products, secure payments.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button size="lg" className="bg-blue-500 hover:bg-blue-400 text-white font-semibold shadow-lg shadow-blue-500/30 h-12 px-6 rounded-xl" asChild>
                  <Link to="/products">Shop Now <FiArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-white/5 backdrop-blur h-12 px-6 rounded-xl" asChild>
                  <Link to={user ? "/buyer/profile?becomeSeller=true" : "/login"}>Sell on GUL PLAZA</Link>
                </Button>
              </div>
              <div className="flex items-center gap-5 text-sm">
                {['500+ Verified Sellers', '10,000+ Products', 'Cash on Delivery'].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 text-xs">✓</span>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="hidden md:grid grid-cols-2 gap-3">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden animate-pulse">
                      <div className="w-full h-36 bg-white/10" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-white/15 rounded w-3/4" />
                        <div className="h-2.5 bg-white/10 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                : products.slice(0, 4).map((p, i) => (
                    <Link key={p.id} to={`/products/${p.id}`}
                      className={`group bg-white/8 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-blue-400/50 hover:bg-white/15 transition-all duration-300 ${i === 0 ? 'col-span-2 row-span-1' : ''}`}>
                      <img
                        src={(() => { const img = p.images?.[0]; if (!img) return p.primary_image || ''; if (typeof img === 'string') return img; return (img as { image_url: string }).image_url })() || p.primary_image || ''}
                        alt={p.name || p.title}
                        className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${i === 0 ? 'h-36' : 'h-32'}`}
                      />
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-white truncate">{p.name || p.title}</p>
                        <p className="text-blue-300 text-xs mt-0.5">Rs. {Number(p.price).toLocaleString()}</p>
                      </div>
                    </Link>
                  ))
              }
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700">
            {[
              { icon: FiShield, title: 'Secure Payments', desc: 'Multiple payment options', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
              { icon: FiTruck, title: 'Fast Delivery', desc: 'Nationwide coverage', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
              { icon: FiHeadphones, title: '24/7 Support', desc: 'Always here to help', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="flex items-center justify-center gap-3 px-4">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4.5 w-4.5 ${color}`} />
                </div>
                <div className="hidden sm:block">
                  <p className={`font-semibold text-sm ${color}`}>{title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-14 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Shop by Category</h2>
              <div className="mt-1 w-12 h-1 bg-blue-500 rounded-full" />
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 gap-1" asChild>
              <Link to="/products">View All <FiArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="flex flex-col items-center gap-2.5 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
              >
                {cat.sample_image ? (
                  <img
                    src={cat.sample_image}
                    alt={cat.name}
                    className="w-12 h-12 object-cover rounded-xl"
                    onError={e => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'block') }}
                  />
                ) : (
                  <span className="text-3xl leading-none">{getCategoryIcon(cat.name, cat.slug)}</span>
                )}
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-14 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Featured Products</h2>
              <div className="mt-1 w-12 h-1 bg-blue-500 rounded-full" />
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Hand-picked products just for you</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl gap-1" asChild>
              <Link to="/products">See All <FiArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featuredProducts.map(product => (
                  <ProductCard key={product.id} product={{
                    ...product,
                    name: product.title,
                    images:
                      product.images && product.images.length > 0
                        ? product.images
                        : product.primary_image
                        ? [product.primary_image]
                        : [],
                    price: Number(product.price),
                  }} />
                ))
            }
          </div>
        </div>
      </section>

      {/* Promo Banner - Only show for non-seller users */}
      {(!user || user.role === 'buyer') && (
        <section className="py-10 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 rounded-3xl p-8 md:p-12 text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />
              <div className="relative text-center">
                <span className="inline-block text-4xl mb-3">🚀</span>
                <h2 className="text-3xl font-extrabold mb-2">Become a Seller Today</h2>
                <p className="text-orange-100 mb-7 text-lg max-w-xl mx-auto">Open your online store for free and reach thousands of buyers across Pakistan.</p>
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg px-8 rounded-xl" asChild>
                  <Link to={user ? "/buyer/profile?becomeSeller=true" : "/login"}>Start Selling — It's Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trending Stores */}
      {stores.length > 0 && (
        <section className="py-14 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Trending Stores</h2>
                <div className="mt-1 w-12 h-1 bg-blue-500 rounded-full" />
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Top-rated sellers with amazing products</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map(store => (
                <StoreCard key={store.id} store={{
                  id: String(store.id),
                  sellerId: String(store.owner_id),
                  sellerName: store.name,
                  name: store.name,
                  slug: String(store.id),
                  description: store.description || '',
                  logo: store.logo_url || '/default-store-logo.png',
                  banner: store.banner_url || '',
                  contactEmail: '',
                  whatsapp: '',
                  isVerified: true,
                  rating: 0,
                  reviewCount: 0,
                  productCount: store.product_count,
                  isApproved: true,
                  isBlocked: false,
                  createdAt: '',
                }} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Products */}
      {(loading || moreProducts.length > 0) && <section className="py-14 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">New Arrivals</h2>
              <div className="mt-1 w-12 h-1 bg-blue-500 rounded-full" />
            </div>
            <Button variant="outline" size="sm" className="rounded-xl gap-1" asChild>
              <Link to="/products">View All <FiArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : moreProducts.map(product => (
                  <ProductCard key={product.id} product={{
                    ...product,
                    name: product.title,
                    images:
                      product.images && product.images.length > 0
                        ? product.images
                        : product.primary_image
                        ? [product.primary_image]
                        : [],
                    price: Number(product.price),
                  }} />
                ))
            }
          </div>
        </div>
      </section>}
    </div>
  )
}
