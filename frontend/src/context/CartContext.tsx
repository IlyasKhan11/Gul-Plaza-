import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { CartItem, Product } from '@/types'

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gul_plaza_cart')
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return
      // Validate each cart item — discard anything malformed
      const valid: CartItem[] = parsed.filter((item: unknown) => {
        if (!item || typeof item !== 'object') return false
        const i = item as Record<string, unknown>
        if (!i.product || typeof i.product !== 'object') return false
        const p = i.product as Record<string, unknown>
        const price = Number(p.price)
        const stock = Number(p.stock)
        const qty = Number(i.quantity)
        return (
          typeof p.id === 'string' &&
          isFinite(price) && price > 0 &&
          isFinite(qty) && qty > 0 && Number.isInteger(qty) &&
          isFinite(stock) && stock >= 0
        )
      }).map((item: CartItem) => ({
        product: item.product,
        quantity: Math.min(Math.max(1, Math.trunc(item.quantity)), Math.max(1, item.product.stock ?? 1)),
      }))
      setItems(valid)
    } catch {
      localStorage.removeItem('gul_plaza_cart')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('gul_plaza_cart', JSON.stringify(items))
  }, [items])

  function addItem(product: Product, quantity = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) }
            : i
        )
      }
      return [...prev, { product, quantity }]
    })
  }

  function removeItem(productId: string) {
    setItems(prev => prev.filter(i => i.product.id !== productId))
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) return removeItem(productId)
    setItems(prev =>
      prev.map(i => {
        if (i.product.id !== productId) return i
        const maxQty = i.product.stock ?? 1
        return { ...i, quantity: Math.min(Math.trunc(quantity), maxQty) }
      })
    )
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
