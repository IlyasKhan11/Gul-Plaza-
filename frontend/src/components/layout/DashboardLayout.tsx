import { useState, useEffect, useRef, Component, type ReactNode } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { FiLogOut, FiBell, FiHome, FiShoppingBag, FiBriefcase, FiCheckCircle, FiInfo, FiCheck, FiMenu, FiX, FiSun, FiMoon } from 'react-icons/fi'
import gulPlazaLogo from '@/assets/gulplazalogo.png'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { SellerSidebar } from './SellerSidebar'
import { AdminSidebar } from './AdminSidebar'
import { BuyerSidebar } from './BuyerSidebar'
import { api } from '@/lib/api'

interface ApiNotification {
  id: number
  type: 'order' | 'withdrawal' | 'approval' | 'system'
  title: string
  message: string
  link?: string | null
  is_read: boolean
  created_at: string
}

// Error boundary to catch crashes in page components
class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1 max-w-md">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const typeIcon = (type: ApiNotification['type']) => {
  if (type === 'order') return <FiShoppingBag className="h-4 w-4 text-blue-500" />
  if (type === 'withdrawal') return <FiBriefcase className="h-4 w-4 text-amber-500" />
  if (type === 'approval') return <FiCheckCircle className="h-4 w-4 text-green-500" />
  return <FiInfo className="h-4 w-4 text-slate-400" />
}

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const sseRef = useRef<EventSource | null>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Fetch notifications on mount
  useEffect(() => {
    if (!user) return
    api.get<{ success: boolean; data: { notifications: ApiNotification[] } }>('/api/notifications')
      .then(res => { if (res.success) setNotifications(res.data.notifications) })
      .catch(() => { })
  }, [user])

  // SSE for real-time notifications
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('gul_plaza_token')
    if (!token) return
    const apiUrl = import.meta.env.VITE_API_URL as string

    // Safely construct URL avoiding double slashes and preventing pre-pended domains
    const sseUrl = apiUrl
      ? `${apiUrl.replace(/\\/$ /, '')}/api/notifications/sse?token=${token}`
      : `/api/notifications/sse?token=${token}`

    const es = new EventSource(sseUrl)
    sseRef.current = es
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.event === 'notification' && payload.data) {
          setNotifications(prev => [payload.data as ApiNotification, ...prev])
        }
      } catch { }
    }
    return () => { es.close(); sseRef.current = null }
  }, [user])

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    api.put('/api/notifications/read-all').catch(() => { })
  }

  async function markRead(id: number) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    api.put(`/api/notifications/${id}/read`).catch(() => { })
  }

  function getSidebar(onLinkClick?: () => void) {
    if (user?.role === 'seller') return <SellerSidebar onLinkClick={onLinkClick} />
    if (user?.role === 'admin') return <AdminSidebar onLinkClick={onLinkClick} />
    return <BuyerSidebar onLinkClick={onLinkClick} />
  }

  const roleColor = user?.role === 'admin' ? 'destructive' : user?.role === 'seller' ? 'info' : 'secondary'
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Top header */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 sm:px-5 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Hamburger — mobile only */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
          </Button>

          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={gulPlazaLogo} alt="GUL PLAZA" className="h-10 md:h-48 md:w-48 lg:h-[200px] lg:w-[200px] rounded-md object-contain" />
          </Link>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <Badge variant={roleColor} className="capitalize text-xs hidden sm:inline-flex">{user?.role} Dashboard</Badge>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-blue-600 gap-1.5 hidden sm:flex">
            <Link to="/"><FiHome className="h-4 w-4" /> Home</Link>
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <FiBell className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <FiBell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <FiCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    <FiBell className="h-8 w-8 mx-auto mb-2 text-slate-200 dark:text-slate-600" />
                    No notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex gap-3 items-start ${!n.is_read ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}`}
                      onClick={() => { markRead(n.id); if (n.link) navigate(n.link) }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.type === 'order' ? 'bg-blue-100 dark:bg-blue-900/40' : n.type === 'withdrawal' ? 'bg-amber-100 dark:bg-amber-900/40' : n.type === 'approval' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-slate-100 dark:bg-slate-700'
                        }`}>
                        {typeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                    </button>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2.5 text-center">
                  <span className="text-xs text-slate-400 dark:text-slate-500">{notifications.length} total notifications</span>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-700">
            <Avatar className="h-8 w-8 border-2 border-slate-100 dark:border-slate-700">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="text-sm font-bold">{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-none">{user?.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={async () => { await logout(); navigate('/') }}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1.5"
          >
            <FiLogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar wrapper */}
        <div className={cn(
          'shrink-0 transition-transform duration-300 ease-in-out',
          // Mobile: fixed overlay sliding from left
          'fixed top-14 bottom-0 left-0 z-50',
          // Desktop: part of normal flex flow
          'md:relative md:top-auto md:bottom-auto md:left-auto md:z-auto md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {getSidebar(closeSidebar)}
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-auto min-w-0">
          <PageErrorBoundary key={pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  )
}
