import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, UserRole } from '@/types'
import { authService } from '@/services/authService'

const TOKEN_KEY = 'gul_plaza_token'
const USER_KEY = 'gul_plaza_user'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; name?: string }>
  register: (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    phone?: string
  ) => Promise<{ success: boolean; message: string }>
  upgradeToSeller: () => void
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored) as User)
      } catch {
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(TOKEN_KEY)
      }
    }
  }, [])

  async function login(email: string, password: string) {
    try {
      const { token, user: loggedInUser } = await authService.login(email, password)
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser))
      sessionStorage.setItem('welcome_name', loggedInUser.name)
      setUser(loggedInUser)
      return { success: true, message: 'Logged in successfully.', name: loggedInUser.name }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Login failed.' }
    }
  }

  async function register(
    name: string,
    email: string,
    password: string,
    role: UserRole,
    phone = '0000000000'
  ) {
    try {
      await authService.register(name, email, password, phone, role)
      return { success: true, message: 'Account created. Please log in.' }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Registration failed.',
      }
    }
  }

  async function logout() {
    await authService.logout()
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  function upgradeToSeller() {
    // TODO: call /api/sellers/apply once that endpoint is built
    if (!user) return
    const updated = { ...user, role: 'seller' as UserRole }
    localStorage.setItem(USER_KEY, JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider
      value={{ user, login, register, upgradeToSeller, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
