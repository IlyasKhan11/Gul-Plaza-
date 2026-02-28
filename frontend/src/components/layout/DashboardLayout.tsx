import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { LogOut, Bell, Home, ShoppingBag, Wallet, CheckCircle, Info, Check, Menu, X } from 'lucide-react'
import gulPlazaLogo from '@/assets/gul-plaza.jpeg'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { SellerSidebar } from './SellerSidebar'
import { AdminSidebar } from './AdminSidebar'
import { BuyerSidebar } from './BuyerSidebar'
import { mockNotifications } from '@/data/mockData'
import type { Notification } from '@/types'

const typeIcon = (type: Notification['type']) => {
  if (type === 'order') return <ShoppingBag className="h-4 w-4 text-blue-500" />
  if (type === 'withdrawal') return <Wallet className="h-4 w-4 text-amber-500" />
  if (type === 'approval') return <CheckCircle className="h-4 w-4 text-green-500" />
  return <Info className="h-4 w-4 text-slate-400" />
}

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(
    mockNotifications.filter(n => n.userId === user?.id)
  )

  const unreadCount = notifications.filter(n => !n.isRead).length

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  function getSidebar(onLinkClick?: () => void) {
    if (user?.role === 'seller') return <SellerSidebar onLinkClick={onLinkClick} />
    if (user?.role === 'admin') return <AdminSidebar onLinkClick={onLinkClick} />
    return <BuyerSidebar onLinkClick={onLinkClick} />
  }

  const roleColor = user?.role === 'admin' ? 'destructive' : user?.role === 'seller' ? 'info' : 'secondary'
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-5 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Hamburger — mobile only */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={gulPlazaLogo} alt="GUL PLAZA" className="h-8 w-auto rounded-md object-contain" />
          </Link>
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <Badge variant={roleColor} className="capitalize text-xs hidden sm:inline-flex">{user?.role} Dashboard</Badge>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-blue-600 gap-1.5 hidden sm:flex">
            <Link to="/"><Home className="h-4 w-4" /> Store</Link>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4.5 w-4.5 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-slate-600" />
                  <span className="font-semibold text-slate-900 text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                    No notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 items-start ${!n.isRead ? 'bg-blue-50/60' : ''}`}
                      onClick={() => { markRead(n.id); if (n.link) navigate(n.link) }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        n.type === 'order' ? 'bg-blue-100' : n.type === 'withdrawal' ? 'bg-amber-100' : n.type === 'approval' ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        {typeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{n.createdAt}</p>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                    </button>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="border-t border-slate-100 px-4 py-2.5 text-center">
                  <span className="text-xs text-slate-400">{notifications.length} total notifications</span>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
            <Avatar className="h-8 w-8 border-2 border-slate-100">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="text-sm font-bold">{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-none">{user?.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => { logout(); navigate('/') }}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
          >
            <LogOut className="h-4 w-4" />
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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
