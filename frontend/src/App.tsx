import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { ProfileRedirect } from '@/components/ProfileRedirect'

import { HomePage } from '@/pages/HomePage'
import { ProductsPage } from '@/pages/ProductsPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { StorePage } from '@/pages/StorePage'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'

import { SellerDashboardPage } from '@/pages/seller/SellerDashboardPage'
import { SellerProductsPage } from '@/pages/seller/SellerProductsPage'
import { SellerOrdersPage } from '@/pages/seller/SellerOrdersPage'
import { SellerEarningsPage } from '@/pages/seller/SellerEarningsPage'
import { SellerStorePage } from '@/pages/seller/SellerStorePage'
import { SellerWithdrawalsPage } from '@/pages/seller/SellerWithdrawalsPage'

import { BuyerOrdersPage } from '@/pages/buyer/BuyerOrdersPage'
import { BuyerProfilePage } from '@/pages/buyer/BuyerProfilePage'
import { WishlistPage } from '@/pages/buyer/WishlistPage'

import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminSellersPage } from '@/pages/admin/AdminSellersPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { AdminTransactionsPage } from '@/pages/admin/AdminTransactionsPage'
import { AdminWithdrawalsPage } from '@/pages/admin/AdminWithdrawalsPage'
import { AdminCommissionsPage } from '@/pages/admin/AdminCommissionsPage'
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="stores/:id" element={<StorePage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="profile" element={<ProfileRedirect />} />
        </Route>

        {/* Seller routes */}
        <Route element={
          <ProtectedRoute allowedRoles={['seller']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="seller/dashboard" element={<SellerDashboardPage />} />
          <Route path="seller/products" element={<SellerProductsPage />} />
          <Route path="seller/products/new" element={<SellerProductsPage />} />
          <Route path="seller/orders" element={<SellerOrdersPage />} />
          <Route path="seller/earnings" element={<SellerEarningsPage />} />
          <Route path="seller/store" element={<SellerStorePage />} />
          <Route path="seller/withdrawals" element={<SellerWithdrawalsPage />} />
        </Route>

        {/* Buyer routes */}
        <Route element={
          <ProtectedRoute allowedRoles={['buyer']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="buyer/orders" element={<BuyerOrdersPage />} />
          <Route path="buyer/wishlist" element={<WishlistPage />} />
          <Route path="buyer/profile" element={<BuyerProfilePage />} />
        </Route>

        {/* Admin routes */}
        <Route element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/sellers" element={<AdminSellersPage />} />
          <Route path="admin/products" element={<AdminProductsPage />} />
          <Route path="admin/orders" element={<AdminOrdersPage />} />
          <Route path="admin/transactions" element={<AdminTransactionsPage />} />
          <Route path="admin/withdrawals" element={<AdminWithdrawalsPage />} />
          <Route path="admin/commissions" element={<AdminCommissionsPage />} />
          <Route path="admin/reports" element={<AdminReportsPage />} />
          <Route path="admin/categories" element={<AdminCategoriesPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
