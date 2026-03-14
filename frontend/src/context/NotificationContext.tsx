import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

interface Notification {
  id: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = { current: null as EventSource | null };

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Connect to SSE endpoint
    const connectSSE = () => {
      const token = localStorage.getItem('gul_plaza_token');
      if (!token) return;

      // Check if token is expired
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.exp && Date.now() >= payload.exp * 1000) {
            // Token is expired, clear it and don't connect
            localStorage.removeItem('gul_plaza_token');
            localStorage.removeItem('gul_plaza_user');
            return;
          }
        }
      } catch (e) {
        // Invalid token format, clear it
        localStorage.removeItem('gul_plaza_token');
        localStorage.removeItem('gul_plaza_user');
        return;
      }

      const eventSource = new EventSource(
        `${BASE_URL}/api/notifications/sse?token=${token}`
      );

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected');
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'connected') {
            console.log('Notification service connected');
            return;
          }

          // Add new notification to state
          const newNotification: Notification = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            event: data.event,
            data: data.data,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50 notifications

          // Play notification sound (optional)
          // new Audio('/notification.mp3').play().catch(() => {});
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setIsConnected(false);
        eventSource.close();
        
        // Reconnect after 5 seconds
        setTimeout(() => {
          if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
            connectSSE();
          }
        }, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
