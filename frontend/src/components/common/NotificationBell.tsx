import { useState } from 'react'
import { FiBell } from 'react-icons/fi'
import { useNotifications } from '@/context/NotificationContext'
import { Button } from '@/components/ui/button'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isConnected } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getNotificationMessage = (notification: { event: string; data: Record<string, unknown> }) => {
    switch (notification.event) {
      case 'seller_application':
        return `New seller application from ${notification.data?.name || 'Unknown'}`
      case 'seller_application_approved':
        return `Seller application approved: ${notification.data?.name || 'Unknown'}`
      case 'seller_application_rejected':
        return `Seller application rejected: ${notification.data?.name || 'Unknown'}`
      case 'withdrawal_request':
        return `New withdrawal request: Rs. ${notification.data?.amount || 0}`
      case 'withdrawal_approved':
        return `Withdrawal approved: Rs. ${notification.data?.amount || 0}`
      case 'withdrawal_rejected':
        return `Withdrawal rejected: Rs. ${notification.data?.amount || 0}`
      case 'new_order':
        return `New order #${notification.data?.orderId || 'Unknown'}`
      case 'order_shipped':
        return `Order #${notification.data?.orderId || 'Unknown'} shipped via ${notification.data?.courierName || 'courier'}`
      case 'order_delivered':
        return String(notification.data?.message || `Order #${notification.data?.orderId || 'Unknown'} delivered!`)
      case 'new_report':
        return `New report received: ${notification.data?.type || 'Unknown'}`
      case 'order_status_changed':
        return String(notification.data?.message || `Order #${notification.data?.orderId || 'Unknown'} status changed`)
      default:
        return `New notification: ${notification.event}`
    }
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FiBell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {/* Connection status indicator */}
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="flex items-center justify-between p-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 truncate">
                        {getNotificationMessage(notification)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
