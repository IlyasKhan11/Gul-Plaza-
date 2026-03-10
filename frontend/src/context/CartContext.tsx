import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { CartItem, Product } from '@/types'

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, quantity?: number, variantId?: number, variantLabel?: string) => void
  removeItem: (productId: string, variantId?: number) => void
  updateQuantity: (productId: string, quantity: number, variantId?: number) => void
  clearCart: () => void
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType | null>(null)

function itemKey(productId: string, variantId?: number) {
  return `${productId}:${variantId ?? 'none'}`
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gul_plaza_cart')
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return
      const valid: CartItem[] = parsed.filter((item: unknown) => {
        if (!item || typeof item !== 'object') return false
        const i = item as Record<string, unknown>
        if (!i.product || typeof i.product !== 'object') return false
        const p = i.product as Record<string, unknown>
        const price = Number(p.price)
        const stock = Number(p.stock)
        const qty = Number(i.quantity)
        return (
          (typeof p.id === 'string' || typeof p.id === 'number') &&
          isFinite(price) && price > 0 &&
          isFinite(qty) && qty > 0 && Number.isInteger(qty) &&
          isFinite(stock) && stock >= 0
        )
      }).map((item: CartItem) => ({
        product: item.product,
        quantity: Math.min(Math.max(1, Math.trunc(item.quantity)), Math.max(1, item.product.stock ?? 1)),
        variantId: item.variantId,
        variantLabel: item.variantLabel,
      }))
      setItems(valid)
    } catch {
      localStorage.removeItem('gul_plaza_cart')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('gul_plaza_cart', JSON.stringify(items))
  }, [items])

  function addItem(product: Product, quantity = 1, variantId?: number, variantLabel?: string) {
    setItems(prev => {
      const key = itemKey(product.id, variantId)
      const existing = prev.find(i => itemKey(i.product.id, i.variantId) === key)
      const maxStock = variantId
        ? (product.variants?.find(v => v.id === variantId)?.stock ?? product.stock ?? 1)
        : (product.stock ?? 1)
      if (existing) {
        return prev.map(i =>
          itemKey(i.product.id, i.variantId) === key
            ? { ...i, quantity: Math.min(i.quantity + quantity, maxStock) }
            : i
        )
      }
      return [...prev, { product, quantity: Math.min(quantity, maxStock), variantId, variantLabel }]
    })
  }

  function removeItem(productId: string, variantId?: number) {
    setItems(prev => prev.filter(i => itemKey(i.product.id, i.variantId) !== itemKey(productId, variantId)))
  }

  function updateQuantity(productId: string, quantity: number, variantId?: number) {
    if (quantity <= 0) return removeItem(productId, variantId)
    setItems(prev =>
      prev.map(i => {
        if (itemKey(i.product.id, i.variantId) !== itemKey(productId, variantId)) return i
        const maxQty = variantId
          ? (i.product.variants?.find(v => v.id === variantId)?.stock ?? i.product.stock ?? 1)
          : (i.product.stock ?? 1)
        return { ...i, quantity: Math.min(Math.trunc(quantity), maxQty) }
      })
    )
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((sum, i) => {
    let price: number = 0
    if (i.variantId) {
      const variant = i.product.variants?.find(v => v.id === i.variantId)
      price = variant ? Number(variant.price) : Number(i.product.price)
    } else {
      price = Number(i.product.price)
    }
    return sum + (isFinite(price) ? price : 0) * i.quantity
  }, 0)
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
