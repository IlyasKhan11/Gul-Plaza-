import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductCard } from '@/components/common/ProductCard'
import { mockProducts, mockCategories } from '@/data/mockData'
import { formatPrice } from '@/lib/utils'

export function ProductsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') ?? 'all')
  const [priceRange, setPriceRange] = useState([0, 150000])
  const [sortBy, setSortBy] = useState('featured')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let result = [...mockProducts]
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))
    if (selectedCategory && selectedCategory !== 'all') {
      const cat = mockCategories.find(c => c.slug === selectedCategory)
      if (cat) result = result.filter(p => p.categoryId === cat.id)
    }
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])
    if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating)
    else if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return result
  }, [search, selectedCategory, priceRange, sortBy])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Filter */}
        <aside className={`md:w-56 shrink-0 space-y-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-5">
            <h3 className="font-semibold text-slate-900">Filters</h3>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-400 tracking-wide">Category</Label>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${selectedCategory === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  All Categories
                </button>
                {mockCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center gap-2 ${selectedCategory === cat.slug ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-xs uppercase text-slate-400 tracking-wide">Price Range</Label>
              <Slider
                min={0}
                max={150000}
                step={1000}
                value={priceRange}
                onValueChange={setPriceRange}
              />
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>{formatPrice(priceRange[0])}</span>
                <span>{formatPrice(priceRange[1])}</span>
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full" onClick={() => { setSelectedCategory('all'); setPriceRange([0, 150000]); setSearch('') }}>
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
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-sm text-slate-500 mb-4">{filtered.length} products found</p>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-xl mb-2">No products found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
