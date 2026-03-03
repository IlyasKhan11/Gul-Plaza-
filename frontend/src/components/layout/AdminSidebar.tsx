import { NavLink, useNavigate } from 'react-router-dom'
import { FiGrid, FiUsers, FiGlobe, FiPackage, FiShoppingBag, FiCreditCard, FiShield, FiPercent, FiBriefcase, FiBarChart2, FiLogOut } from 'react-icons/fi'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { to: '/admin/dashboard', icon: FiGrid, label: 'Dashboard' },
  { to: '/admin/users', icon: FiUsers, label: 'Users' },
  { to: '/admin/sellers', icon: FiGlobe, label: 'Sellers' },
  { to: '/admin/products', icon: FiPackage, label: 'Products' },
  { to: '/admin/orders', icon: FiShoppingBag, label: 'Orders' },
  { to: '/admin/transactions', icon: FiCreditCard, label: 'Transactions' },
  { to: '/admin/withdrawals', icon: FiBriefcase, label: 'Withdrawals' },
  { to: '/admin/commissions', icon: FiPercent, label: 'Commissions' },
  { to: '/admin/reports', icon: FiBarChart2, label: 'Reports' },
]

export function AdminSidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Defensive: Only render sidebar for admins
  if (!user || user.role !== 'admin') return null

  async function handleLogout() {
    onLinkClick?.()
    await logout()
    navigate('/')
  }

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <FiShield className="h-4 w-4 text-white" />
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
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-white/10 hover:text-red-300 transition-colors"
        >
          <FiLogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  )
}
