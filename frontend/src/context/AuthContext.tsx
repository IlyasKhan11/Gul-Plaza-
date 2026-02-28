import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, UserRole } from '@/types'
import { mockUsers } from '@/data/mockData'
import { generateId } from '@/lib/utils'

interface AuthContextType {
  user: User | null
  login: (email: string, _password: string) => Promise<{ success: boolean; message: string }>
  register: (name: string, email: string, _password: string, role: UserRole) => Promise<{ success: boolean; message: string }>
  upgradeToSeller: () => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('gul_plaza_user')
    if (stored) {
      setUser(JSON.parse(stored) as User)
    }
  }, [])

  async function login(email: string, _password: string) {
    const found = mockUsers.find(u => u.email === email)
    if (!found) return { success: false, message: 'No account found with this email.' }
    if (found.isBlocked) return { success: false, message: 'Your account has been blocked.' }
    localStorage.setItem('gul_plaza_user', JSON.stringify(found))
    setUser(found)
    return { success: true, message: 'Logged in successfully.' }
  }

  async function register(name: string, email: string, _password: string, role: UserRole) {
    const exists = mockUsers.find(u => u.email === email)
    if (exists) return { success: false, message: 'An account with this email already exists.' }
    const newUser: User = {
      id: generateId(),
      name,
      email,
      role,
      isBlocked: false,
      createdAt: new Date().toISOString().split('T')[0],
    }
    mockUsers.push(newUser)
    localStorage.setItem('gul_plaza_user', JSON.stringify(newUser))
    setUser(newUser)
    return { success: true, message: 'Account created successfully.' }
  }

  function upgradeToSeller() {
    if (!user) return
    const updated = { ...user, role: 'seller' as UserRole }
    const idx = mockUsers.findIndex(u => u.id === user.id)
    if (idx !== -1) mockUsers[idx] = updated
    localStorage.setItem('gul_plaza_user', JSON.stringify(updated))
    setUser(updated)
  }

  function logout() {
    localStorage.removeItem('gul_plaza_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, upgradeToSeller, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
