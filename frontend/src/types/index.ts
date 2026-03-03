export type UserRole = 'buyer' | 'seller' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  address?: string
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

export interface Product {
  id: string
  storeId: string
  storeName: string
  sellerId: string
  name: string
  description: string
  price: number
  originalPrice?: number
  category: string
  categoryId: string
  images: string[]
  stock: number
  rating: number
  reviewCount: number
  isFeatured: boolean
  createdAt: string
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

export interface CartItem {
  product: Product
  quantity: number
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

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
