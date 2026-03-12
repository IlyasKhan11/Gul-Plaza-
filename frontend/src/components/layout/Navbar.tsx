import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiSearch, FiMenu, FiX, FiUser, FiLogOut, FiGrid, FiPackage, FiSun, FiMoon } from 'react-icons/fi'
import gulPlazaLogo from '@/assets/gulplazalogo.png'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useTheme } from '@/context/ThemeContext'
import { api } from '@/lib/api'

interface NavCategory {
  id: number
  name: string
  slug: string
  parent_id: number | null
  sample_image: string | null
}

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const { itemCount } = useCart()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categories, setCategories] = useState<NavCategory[]>([])

  useEffect(() => {
    api.get<{ success: boolean; data: NavCategory[] }>('/api/categories')
      .then(res => {
        if (res.success && res.data.length > 0) {
          setCategories(res.data.filter(c => c.parent_id === null))
        }
      })
      .catch(() => {})
  }, [])

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
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Top bar */}
      <div className="bg-blue-600 dark:bg-slate-800 text-white text-xs py-1 text-center">
        Cash on Delivery Available
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={gulPlazaLogo} alt="GUL PLAZA" className="h-10 md:h-48 md:w-48 lg:h-[200px] lg:w-[200px] rounded-lg object-contain" />
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 max-w-2xl">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products, stores..."
                className="pl-9 h-10"
              />
            </div>
            <Button type="submit" className="hidden sm:flex h-10"><FiSearch className="h-4 w-4" /></Button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-slate-500 dark:text-slate-400"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <FiSun className="h-4.5 w-4.5" /> : <FiMoon className="h-4.5 w-4.5" />}
            </Button>

            {/* Cart — only visible to buyers and guests */}
            {(!user || user.role === 'buyer') && (
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="icon">
                  <FiShoppingCart className="h-5 w-5" />
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
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{user.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                    <Badge variant="info" className="mt-1 capitalize">{user.role}</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())}>
                    <FiGrid className="h-4 w-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  {user.role === 'buyer' && (
                    <DropdownMenuItem onClick={() => navigate('/buyer/orders')}>
                      <FiPackage className="h-4 w-4 mr-2" />
                      My Orders
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await logout(); navigate('/') }} className="text-red-600">
                    <FiLogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login"><FiUser className="h-4 w-4 mr-1" />Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Register</Link>
                </Button>
              </div>
            )}

            {/* Mobile toggle */}
            <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Category nav */}
      {categories.length > 0 && (
        <div className="bg-blue-600 dark:bg-slate-800 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-1 overflow-x-auto">
              {categories.slice(0, 7).map(cat => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-100 dark:text-slate-300 hover:text-white dark:hover:text-white hover:bg-blue-700 dark:hover:bg-slate-700 rounded transition-colors whitespace-nowrap"
                >
                  {cat.sample_image && (
                    <img
                      src={cat.sample_image}
                      alt={cat.name}
                      className="w-5 h-5 rounded object-cover opacity-90"
                      onError={e => { e.currentTarget.style.display = 'none' }}
                    />
                  )}
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
          {!isAuthenticated && (
            <div className="flex gap-2">
              <Button className="flex-1" asChild><Link to="/login">Login</Link></Button>
              <Button variant="outline" className="flex-1" asChild><Link to="/register">Register</Link></Button>
            </div>
          )}
          {categories.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {categories.slice(0, 8).map(cat => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-center"
                >
                  {cat.sample_image ? (
                    <img
                      src={cat.sample_image}
                      alt={cat.name}
                      className="w-10 h-10 rounded-lg object-cover"
                      onError={e => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-blue-500 text-lg">
                      🏷️
                    </div>
                  )}
                  <span className="text-xs text-slate-600 dark:text-slate-400">{cat.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  )
}
