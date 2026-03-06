import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiHeart, FiShoppingCart, FiTrash2, FiRefreshCw } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { wishlistService, type WishlistItem } from '@/services/wishlistService'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils'

export function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)
  const { addItem } = useCart()

  const fetchWishlist = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await wishlistService.getWishlist()
      setItems(data)
    } catch {
      setError('Failed to load wishlist')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWishlist() }, [])

  const handleRemove = async (productId: number) => {
    setRemoving(productId)
    try {
      await wishlistService.remove(productId)
      setItems(prev => prev.filter(i => i.id !== productId))
    } finally {
      setRemoving(null)
    }
  }

  const handleAddToCart = (item: WishlistItem) => {
    addItem({
      id: item.id,
      title: item.title,
      name: item.title,
      price: Number(item.price),
      stock: item.stock,
      images: item.primary_image ? [item.primary_image] : [],
      primary_image: item.primary_image,
    } as any)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Products</h1>
          <p className="text-slate-500 text-sm mt-1">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWishlist}>
          <FiRefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <FiHeart className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No saved products yet</p>
          <p className="text-slate-400 text-sm mt-1">Browse products and click the heart icon to save them here.</p>
          <Button className="mt-6" asChild>
            <Link to="/products">Browse Products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.wishlist_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
              <Link to={`/products/${item.id}`} className="block relative">
                <div className="aspect-square bg-slate-50 overflow-hidden">
                  {item.primary_image ? (
                    <img
                      src={item.primary_image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=No+Image' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">📦</div>
                  )}
                </div>
                {!item.is_active && (
                  <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                    <span className="text-white text-sm font-medium bg-slate-800 px-3 py-1 rounded-full">Unavailable</span>
                  </div>
                )}
              </Link>

              <div className="p-3 space-y-2">
                <Link to={`/products/${item.id}`}>
                  <p className="font-medium text-slate-800 text-sm line-clamp-2 hover:text-blue-600">{item.title}</p>
                </Link>
                <p className="text-xs text-slate-400">{item.store_name}</p>
                <p className="text-lg font-bold text-slate-900">{formatPrice(Number(item.price))}</p>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleAddToCart(item)}
                    disabled={item.stock === 0 || !item.is_active}
                  >
                    <FiShoppingCart className="h-3.5 w-3.5 mr-1" />
                    {item.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:border-red-300"
                    onClick={() => handleRemove(item.id)}
                    disabled={removing === item.id}
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
