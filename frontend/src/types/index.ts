export type UserRole = 'buyer' | 'seller' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  address?: string
  city?: string
  country?: string
  postal_code?: string
  avatar?: string
  isBlocked: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
  icon: string
  slug: string
  productCount: number
}

export interface Store {
  id: string
  sellerId: string
  sellerName: string
  name: string
  slug: string
  description: string
  logo: string
  banner: string
  contactEmail: string
  whatsapp: string
  easypaisa?: string
  isVerified?: boolean
  rating: number
  reviewCount: number
  productCount: number
  isApproved: boolean
  isBlocked: boolean
  createdAt: string
}

export interface ProductImage {
  id: string
  image_url: string
  public_id?: string
  created_at?: string
}

export interface Product {
  id: string
  storeId?: string
  storeName?: string
  sellerId?: string
  name?: string
  title?: string
  description?: string
  price: number | string
  originalPrice?: number
  category?: string
  categoryId?: string
  images?: string[] | ProductImage[]  // Support both old string array and new object array
  primary_image?: string | null
  stock?: number
  rating?: number
  reviewCount?: number
  isFeatured?: boolean
  createdAt?: string
  store_description?: string // <-- Add this for backend compatibility
  variants?: ProductVariant[]
}

export interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  avatar?: string
  rating: number
  comment: string
  createdAt: string
}

export interface VariantOption {
  type: string
  value: string
}

export interface ProductVariant {
  id: number
  price: number
  stock: number
  is_active: boolean
  options: VariantOption[]
}

export interface CartItem {
  product: Product
  quantity: number
  variantId?: number
  variantLabel?: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderItem {
  product: Product
  quantity: number
  price: number
}

export interface Order {
  id: string
  buyerId: string
  buyerName: string
  buyerPhone: string
  buyerAddress: string
  sellerId: string
  storeName: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  paymentMethod: 'whatsapp' | 'easypaisa' | 'jazzcash' | 'cod'
  transactionId?: string
  paymentVerified?: boolean
  trackingNumber?: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  orderId: string
  sellerId: string
  storeName: string
  amount: number
  commission: number
  sellerShare: number
  status: 'pending' | 'released' | 'withdrawn'
  createdAt: string
}

export interface WithdrawalRequest {
  id: string
  sellerId: string
  storeName: string
  amount: number
  bankName: string
  accountNumber: string
  accountName: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface SalesData {
  month: string
  revenue: number
  orders: number
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'order' | 'withdrawal' | 'approval' | 'system'
  isRead: boolean
  createdAt: string
  link?: string
}
