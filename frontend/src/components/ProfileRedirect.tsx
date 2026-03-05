import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function ProfileRedirect() {
  const { user, isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // Redirect to the appropriate profile based on user role
  switch (user?.role) {
    case 'buyer':
      return <Navigate to="/buyer/profile" replace />
    case 'seller':
      return <Navigate to="/seller/store" replace />
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />
    default:
      return <Navigate to="/" replace />
  }
}
