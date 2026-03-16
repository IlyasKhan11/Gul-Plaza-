import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiSliders, FiStar, FiPackage } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductCard } from '@/components/common/ProductCard'
import { ProductCardSkeleton } from '@/components/common/ProductCardSkeleton'
import type { Category, Product } from '@/types'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

export function ProductsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') ?? 'all')
  const [priceRange, setPriceRange] = useState([0, 150000])
  const [minRating, setMinRating] = useState(0)
  const [sortBy, setSortBy] = useState('featured')
  const [showFilters, setShowFilters] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    let query = '/api/products?page=1&limit=40';
    if (selectedCategory && selectedCategory !== 'all') {
      const cat = categories.find(c => c.slug === selectedCategory);
      if (cat) {
        query += `&category_id=${cat.id}`;
      }
    }
    api.get<{ data: { products: any[] } }>(query)
      .then(res => {
        // Map backend fields to frontend Product type
        const mapped = res.data.products.map(p => ({
          ...p,
          name: p.title ?? '',
          images: p.images && p.images.length > 0 ? p.images : p.primary_image ? [p.primary_image] : [],
          price: Number(p.price),
          categoryId: p.category_id ?? p.categoryId,
          description: p.description ?? '',
          rating: Number(p.rating ?? 0),
          createdAt: p.createdAt ?? p.created_at ?? '',
        }))
        setProducts(mapped)
        setError(null)
      })
      .catch(err => {
        setError(err.message)
        setProducts([])
      })
      .finally(() => setLoading(false))
  }, [selectedCategory, categories])

  // Fetch categories from backend
  useEffect(() => {
    setCatLoading(true)
    api.get<{ success: boolean; data: Category[] }>('/api/categories')
      .then(res => {
        setCategories(res.data)
        setCatError(null)
      })
      .catch(err => {
        setCatError(err.message)
        setCategories([])
      })
      .finally(() => setCatLoading(false))
  }, [])

  // If 'See All' is clicked, selectedCategory will be 'all'. Show all products, not filtered by category.
  const filtered = useMemo(() => {
    let result = [...products]
    if (search) result = result.filter(p => (p.name ?? p.title ?? '').toLowerCase().includes(search.toLowerCase()) || (p.description ?? '').toLowerCase().includes(search.toLowerCase()))
    // Only filter by category if selectedCategory is not 'all'
    // No need to filter by category here, backend already does it
    result = result.filter(p => Number(p.price) >= priceRange[0] && Number(p.price) <= priceRange[1])
    if (minRating > 0) result = result.filter(p => Number(p.rating ?? 0) >= minRating)
    if (sortBy === 'price-asc') result.sort((a, b) => Number(a.price) - Number(b.price))
    else if (sortBy === 'price-desc') result.sort((a, b) => Number(b.price) - Number(a.price))
    else if (sortBy === 'rating') result.sort((a, b) => (Number(b.rating ?? 0)) - (Number(a.rating ?? 0)))
    else if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt ?? '').getTime() - new Date(a.createdAt ?? '').getTime())
    return result
  }, [products, search, selectedCategory, priceRange, minRating, sortBy])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Filter */}
        <aside className={`md:w-56 shrink-0 space-y-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-5">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Filters</h3>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-400 dark:text-slate-500 tracking-wide">Category</Label>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${selectedCategory === 'all' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  All Categories
                </button>
                {catLoading && <div className="text-xs text-slate-400">Loading categories...</div>}
                {catError && <div className="text-xs text-red-500">{catError}</div>}
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center gap-2 ${selectedCategory === cat.slug ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-xs uppercase text-slate-400 dark:text-slate-500 tracking-wide">Price Range</Label>
              <Slider
                min={0}
                max={150000}
                step={1000}
                value={priceRange}
                onValueChange={setPriceRange}
              />
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>{formatPrice(priceRange[0])}</span>
                <span>{formatPrice(priceRange[1])}</span>
              </div>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-400 dark:text-slate-500 tracking-wide">Min. Rating</Label>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map(star => (
                  <button
                    key={star}
                    onClick={() => setMinRating(minRating === star + 1 ? 0 : star + 1)}
                    className={`p-1 rounded transition-colors ${minRating >= star + 1 ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`}
                  >
                    <FiStar className={`h-4 w-4 ${minRating >= star + 1 ? 'fill-amber-400' : ''}`} />
                  </button>
                ))}
                {minRating > 0 && <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{minRating}+</span>}
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full" onClick={() => { setSelectedCategory('all'); setPriceRange([0, 150000]); setSearch(''); setMinRating(0) }}>
              Reset Filters
            </Button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="flex-1"
            />
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="md:hidden" onClick={() => setShowFilters(!showFilters)}>
                <FiSliders className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!loading && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{filtered.length} products found</p>}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <FiPackage className="h-7 w-7 text-red-400" />
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">Failed to load products</p>
              <p className="text-sm text-slate-400">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <FiPackage className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">No products found</p>
              <p className="text-sm text-slate-400">Try adjusting your filters or search term</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSelectedCategory('all'); setPriceRange([0, 150000]); setSearch(''); setMinRating(0) }}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(product => (
                <ProductCard key={product.id} product={{
                  ...product,
                  category: (product as any).category_name ?? product.category,
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
