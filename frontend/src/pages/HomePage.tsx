import { Link } from 'react-router-dom'
import { FiArrowRight, FiShield, FiTruck, FiHeadphones, FiStar } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/common/ProductCard'
import { StoreCard } from '@/components/common/StoreCard'
import { mockCategories, mockStores } from '@/data/mockData'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Product } from '@/types'

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get<{ data: { products: Product[] } }>('/products?page=1&limit=40')
      .then(res => {
        setProducts(res.data.products)
        setError(null)
      })
      .catch(err => {
        setError(err.message)
        setProducts([])
      })
      .finally(() => setLoading(false))
  }, [])

  const featuredProducts = products.filter(p => p.isFeatured)

  return (
    <div className="space-y-0">
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-blue-500/30 border border-blue-400/30 rounded-full px-4 py-1.5 text-sm">
                <FiStar className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>Pakistan's Trusted Marketplace</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Shop Everything,<br />
                <span className="text-blue-200">All in One Place</span>
              </h1>
              <p className="text-blue-100 text-lg">
                Browse thousands of products from verified sellers. Best prices, genuine products, secure payments.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button size="lg" className="bg-white text-black hover:bg-slate-100" asChild>
                  <Link to="/products">Shop Now <FiArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 bg-transparent" asChild>
                  <Link to="/register">Sell on GUL PLAZA</Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-blue-200">
                <span>✓ 500+ Verified Sellers</span>
                <span>✓ 10,000+ Products</span>
                <span>✓ Cash on Delivery</span>
              </div>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-4">
              {featuredProducts.slice(0, 4).map(p => (
                <Link key={p.id} to={`/products/${p.id}`} className="group">
                  <div className="bg-white/10 backdrop-blur rounded-xl overflow-hidden hover:bg-white/20 transition-colors">
                    <img src={p.images?.[0] || p.primary_image || ''} alt={p.name || p.title} className="w-full h-32 object-cover" />
                    <div className="p-2">
                      <p className="text-xs font-medium text-white truncate">{p.name || p.title}</p>
                      <p className="text-blue-200 text-xs">Rs. {Number(p.price).toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: FiShield, title: 'Secure Payments', desc: 'Multiple payment options' },
              { icon: FiTruck, title: 'Fast Delivery', desc: 'Nationwide coverage' },
              { icon: FiHeadphones, title: '24/7 Support', desc: 'Always here to help' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="font-semibold text-sm text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Shop by Category</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/products" className="text-blue-600">View All <FiArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {mockCategories.map(cat => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-xs font-medium text-slate-700 text-center group-hover:text-blue-600">{cat.name}</span>
                <span className="text-xs text-slate-400">{cat.productCount}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Featured Products</h2>
              <p className="text-slate-500 text-sm mt-1">Hand-picked products just for you</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/products">See All <FiArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts.map(product => (
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
            ))}
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <section className="py-8 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-2">Become a Seller Today</h2>
            <p className="text-orange-100 mb-6 text-lg">Open your online store for free and reach thousands of buyers across Pakistan.</p>
            <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50" asChild>
              <Link to="/register">Start Selling — It's Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trending Stores */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Trending Stores</h2>
              <p className="text-slate-500 text-sm mt-1">Top-rated sellers with amazing products</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockStores.map(store => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </div>
      </section>

      {/* All Products */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">More Products</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/products">View All</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.slice(4).map(product => (
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
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
