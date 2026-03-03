import { useState, useEffect, useCallback } from 'react'
import { FiSearch, FiRefreshCw } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { adminService, type ApiProduct } from '@/services/adminService'
import { formatPrice } from '@/lib/utils'

export function AdminProductsPage() {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)

  const fetchProducts = useCallback(async (p: number, q: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getProducts({ page: p, search: q, limit: 20 })
      setProducts(data.products)
      setTotalPages(data.pagination.total_pages)
      setTotalProducts(data.pagination.total_products)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts(1, '') }, [fetchProducts])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchProducts(1, search)
  }

  function changePage(newPage: number) {
    setPage(newPage)
    fetchProducts(newPage, search)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Products</h1>
        <p className="text-slate-500 text-sm mt-1">{totalProducts} products listed on the platform</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchProducts(page, search)}>
            <FiRefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Product Catalog</CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative w-56">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9"
                />
              </div>
              <Button type="submit" size="sm">Search</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">No products found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left pb-3 text-slate-500 font-medium">Product</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Store</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Category</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Price</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Stock</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Status</th>
                      <th className="text-left pb-3 text-slate-500 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {product.product_image ? (
                              <img
                                src={product.product_image}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover bg-slate-50 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0" />
                            )}
                            <p className="font-medium text-slate-800 max-w-[200px] truncate">{product.title}</p>
                          </div>
                        </td>
                        <td className="py-3 text-slate-600 text-xs">{product.store_name ?? '—'}</td>
                        <td className="py-3">
                          {product.category_name
                            ? <Badge variant="secondary">{product.category_name}</Badge>
                            : <span className="text-slate-400">—</span>
                          }
                        </td>
                        <td className="py-3 font-semibold text-slate-900">{formatPrice(parseFloat(product.price))}</td>
                        <td className="py-3">
                          <span className={product.stock < 10 ? 'text-red-600 font-medium' : 'text-slate-700'}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge variant={product.is_active ? 'success' : 'secondary'}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-500 text-xs">
                          {product.rating
                            ? <><span className="text-amber-500">★</span> {Number(product.rating).toFixed(1)} ({product.review_count ?? 0})</>
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changePage(page - 1)}>
                      Previous
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
