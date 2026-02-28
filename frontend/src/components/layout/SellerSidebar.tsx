import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, DollarSign, Wallet, Settings, Store, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { to: '/seller/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/seller/products', icon: Package, label: 'Products' },
  { to: '/seller/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/seller/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/seller/withdrawals', icon: Wallet, label: 'Withdrawals' },
  { to: '/seller/store', icon: Settings, label: 'Store Settings' },
]

export function SellerSidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Store className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Seller Panel</p>
            <p className="text-xs text-slate-400">Manage your store</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1.5">Navigation</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onLinkClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-100' : 'text-slate-400')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button
          onClick={() => { onLinkClick?.(); logout(); navigate('/') }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  )
}
