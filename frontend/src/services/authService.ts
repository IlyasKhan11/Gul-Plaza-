import { api } from '@/lib/api'
import type { User, UserRole } from '@/types'

interface BackendUser {
  publicId: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  is_verified: boolean
  created_at: string
}

interface LoginResponse {
  success: boolean
  data: {
    accessToken: string
    user: BackendUser
    expiresIn: string
  }
}

interface RegisterResponse {
  success: boolean
  message: string
  data: { user: BackendUser }
}

// Map backend user shape to frontend User type
function toUser(u: BackendUser): User {
  return {
    id: u.publicId,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone ?? undefined,
    address: (u as any).address ?? undefined,
    city: (u as any).city ?? undefined,
    country: (u as any).country ?? undefined,
    postal_code: (u as any).postal_code ?? undefined,
    isBlocked: false,
    createdAt: u.created_at,
  }
}

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await api.post<LoginResponse>('/api/auth/login', { email, password })
    return { token: res.data.accessToken, user: toUser(res.data.user) }
  },

  async register(
    name: string,
    email: string,
    password: string,
    phone: string,
    role: UserRole = 'buyer'
  ): Promise<{ user: User }> {
    const res = await api.post<RegisterResponse>('/api/auth/register', {
      name,
      email,
      password,
      phone,
      role,
    })
    return { user: toUser(res.data.user) }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Ignore errors — always clear local state regardless
    }
  },
    async updateUserProfile(profile: { name?: string; phone?: string; address?: string; city?: string }): Promise<{ user: User }> {
      const res = await api.put<RegisterResponse>('/api/users/profile', profile)
      return { user: toUser(res.data.user) }
    },
}
