import { Link } from 'react-router-dom'
import { FiArrowRight, FiShield, FiTruck, FiHeadphones, FiStar, FiTag, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/common/ProductCard'
import { ProductCardSkeleton } from '@/components/common/ProductCardSkeleton'
import { StoreCard } from '@/components/common/StoreCard'
import { useEffect, useState, useRef } from 'react'
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

interface CategorySection {
  name: string
  slug: string
  products: Product[]
}

function CategoryRow({ section }: { section: CategorySection }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <section className="py-8 bg-slate-50 dark:bg-slate-900">
      <div className="w-full px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <FiTag className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{section.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/products?category=${section.slug}`}
              className="text-sm font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 mr-2"
            >
              See all <FiArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <FiChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <FiChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {section.products.map((product) => (
            <div key={product.id} className="flex-none w-48 sm:w-52">
              <ProductCard product={{
                ...product,
                name: product.title,
                category: (product as any).category_name ?? product.category,
                images: product.images?.length ? product.images : product.primary_image ? [product.primary_image] : [],
                price: Number(product.price),
              }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomePage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [stores, setStores] = useState<ApiStore[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get<{ data: { products: Product[] } }>('/api/products?page=1&limit=120')
      .then(res => setProducts(res.data.products))
      .catch(() => setProducts([])  )
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

  // Group products by category name
  const categorySections: CategorySection[] = []
  const seen = new Map<string, CategorySection>()

  for (const p of products) {
    const catName: string = (p as any).category_name ?? p.category ?? 'Other'
    const catSlug: string = (p as any).category_slug ?? catName.toLowerCase().replace(/\s+/g, '-')
    if (!seen.has(catName)) {
      const section = { name: catName, slug: catSlug, products: [] }
      seen.set(catName, section)
      categorySections.push(section)
    }
    seen.get(catName)!.products.push(p)
  }

  return (
    <div className="space-y-0">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="relative w-full px-4 sm:px-6 py-16 md:py-24">
          <div className="flex flex-col items-center text-center space-y-7 max-w-3xl mx-auto">
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
            <p className="text-slate-300 text-lg leading-relaxed max-w-xl">
              Browse thousands of products from verified sellers. Best prices, genuine products, secure payments.
            </p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Button size="lg" className="bg-blue-500 hover:bg-blue-400 text-white font-semibold shadow-lg shadow-blue-500/30 h-12 px-6 rounded-xl" asChild>
                <Link to="/products">Shop Now <FiArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-white/5 backdrop-blur h-12 px-6 rounded-xl" asChild>
                <Link to={user ? "/buyer/profile?becomeSeller=true" : "/login"}>Sell on GUL PLAZA</Link>
              </Button>
            </div>
            <div className="flex items-center gap-5 text-sm justify-center">
              {['500+ Verified Sellers', '10,000+ Products', 'Cash on Delivery'].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 text-xs">✓</span>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="w-full px-4 sm:px-6 py-5">
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
      <section className="py-10 bg-white dark:bg-slate-950">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Shop by Category</h2>
              <div className="mt-1 w-12 h-1 bg-orange-500 rounded-full" />
            </div>
            <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 gap-1" asChild>
              <Link to="/products">View All <FiArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {cat.sample_image ? (
                  <img
                    src={cat.sample_image}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-600" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute bottom-0 left-0 right-0 px-2 pb-2.5 text-[11px] font-bold text-white text-center leading-tight drop-shadow-md">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Products by category */}
      {loading ? (
        <section className="py-8 bg-slate-50 dark:bg-slate-900">
          <div className="w-full px-4 sm:px-6">
            <div className="flex gap-2 mb-5">
              <div className="animate-wind h-6 w-32 rounded-lg" />
            </div>
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-none w-48 sm:w-52">
                  <ProductCardSkeleton delay={i * 80} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        categorySections.map(section => (
          <CategoryRow key={section.name} section={section} />
        ))
      )}

      {/* Promo Banner */}
      {(!user || user.role === 'buyer') && (
        <section className="py-10 bg-white dark:bg-slate-950">
          <div className="w-full px-4 sm:px-6">
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
        <section className="py-10 bg-slate-50 dark:bg-slate-900">
          <div className="w-full px-4 sm:px-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Trending Stores</h2>
                <div className="mt-1 w-12 h-1 bg-orange-500 rounded-full" />
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
    </div>
  )
}
