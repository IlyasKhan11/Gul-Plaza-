import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { mockProducts } from '@/data/mockData'
import { formatPrice } from '@/lib/utils'

export function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Products</h1>
        <p className="text-slate-500 text-sm mt-1">{mockProducts.length} products listed on the platform</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Product Catalog</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left pb-3 text-slate-500 font-medium">Product</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">FiGlobe</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Category</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Price</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Stock</th>
                  <th className="text-left pb-3 text-slate-500 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <img src={product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-50" />
                        <p className="font-medium text-slate-800 max-w-[200px] truncate">{product.name}</p>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">{product.storeName}</td>
                    <td className="py-3">
                      <Badge variant="secondary">{product.category}</Badge>
                    </td>
                    <td className="py-3 font-semibold text-slate-900">{formatPrice(product.price)}</td>
                    <td className="py-3">
                      <span className={product.stock < 10 ? 'text-red-600 font-medium' : 'text-slate-700'}>{product.stock}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-amber-500">★</span> {product.rating} ({product.reviewCount})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
