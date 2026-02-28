import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Store, Package, ShoppingBag, CreditCard, Shield, Percent, Wallet, BarChart2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/sellers', icon: Store, label: 'Sellers' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/admin/transactions', icon: CreditCard, label: 'Transactions' },
  { to: '/admin/withdrawals', icon: Wallet, label: 'Withdrawals' },
  { to: '/admin/commissions', icon: Percent, label: 'Commissions' },
  { to: '/admin/reports', icon: BarChart2, label: 'Reports' },
]

export function AdminSidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Admin Panel</p>
            <p className="text-xs text-slate-500">Full control</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-2 pb-1.5">Navigation</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onLinkClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-200' : 'text-slate-500')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700/60">
        <button
          onClick={() => { onLinkClick?.(); logout(); navigate('/') }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-white/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  )
}
