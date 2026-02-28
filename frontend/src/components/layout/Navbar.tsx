import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Search, Menu, X, User, LogOut, LayoutDashboard, Package } from 'lucide-react'
import gulPlazaLogo from '@/assets/gul-plaza.jpeg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { mockCategories } from '@/data/mockData'

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) navigate(`/products?q=${encodeURIComponent(search.trim())}`)
  }

  function getDashboardLink() {
    if (user?.role === 'seller') return '/seller/dashboard'
    if (user?.role === 'admin') return '/admin/dashboard'
    return '/buyer/orders'
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      {/* Top bar */}
      <div className="bg-blue-600 text-white text-xs py-1 text-center">
        Free shipping on orders over Rs. 2,000 | Cash on Delivery Available
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={gulPlazaLogo} alt="GUL PLAZA" className="h-10 w-auto rounded-lg object-contain" />
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products, stores..."
                className="pl-9 h-10"
              />
            </div>
            <Button type="submit" className="hidden sm:flex h-10">Search</Button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Cart — only visible to buyers and guests */}
            {(!user || user.role === 'buyer') && (
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="icon">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            )}

            {/* Auth */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-semibold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                    <Badge variant="info" className="mt-1 capitalize">{user.role}</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())}>
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  {user.role === 'buyer' && (
                    <DropdownMenuItem onClick={() => navigate('/buyer/orders')}>
                      <Package className="h-4 w-4 mr-2" />
                      My Orders
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { logout(); navigate('/') }} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login"><User className="h-4 w-4 mr-1" />Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Register</Link>
                </Button>
              </div>
            )}

            {/* Mobile toggle */}
            <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Category nav */}
      <div className="bg-blue-600 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {mockCategories.slice(0, 7).map(cat => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-100 hover:text-white hover:bg-blue-700 rounded transition-colors whitespace-nowrap"
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          {!isAuthenticated && (
            <div className="flex gap-2">
              <Button className="flex-1" asChild><Link to="/login">Login</Link></Button>
              <Button variant="outline" className="flex-1" asChild><Link to="/register">Register</Link></Button>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {mockCategories.slice(0, 8).map(cat => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                onClick={() => setMobileOpen(false)}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-blue-50 text-center"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs text-slate-600">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
