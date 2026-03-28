import { mockApi } from './mockApi'

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' || import.meta.env.DEV

function getToken(): string | null {
  return localStorage.getItem('gul_plaza_token')
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('gul_plaza_token')
      localStorage.removeItem('gul_plaza_user')
    }
    throw new Error(data.message || `HTTP ${res.status}`)
  }
  return data as T
}

async function fetchWithFallback<T>(url: string, options?: RequestInit): Promise<T> {
  if (USE_MOCK_API) {
    // Use mock API in development
    const method = options?.method?.toLowerCase() || 'get'
    switch (method) {
      case 'get':
        return mockApi.get<T>(url.replace(BASE_URL, ''))
      case 'post':
        return mockApi.post<T>(url.replace(BASE_URL, ''), options?.body ? JSON.parse(options.body as string) : undefined)
      case 'put':
        return mockApi.put<T>(url.replace(BASE_URL, ''), options?.body ? JSON.parse(options.body as string) : undefined)
      case 'patch':
        return mockApi.patch<T>(url.replace(BASE_URL, ''), options?.body ? JSON.parse(options.body as string) : undefined)
      case 'delete':
        return mockApi.delete<T>(url.replace(BASE_URL, ''))
      default:
        return mockApi.get<T>(url.replace(BASE_URL, ''))
    }
  }

  try {
    const response = await fetch(url, options)
    return handleResponse<T>(response)
  } catch (error) {
    console.warn('Backend not available, falling back to mock data:', error)
    // Fallback to mock API if backend fails
    const method = options?.method?.toLowerCase() || 'get'
    switch (method) {
      case 'get':
        return mockApi.get<T>(url.replace(BASE_URL, ''))
      case 'post':
        return mockApi.post<T>(url.replace(BASE_URL, ''), options?.body ? JSON.parse(options.body as string) : undefined)
      case 'put':
        return mockApi.put<T>(url.replace(BASE_URL, ''), options?.body ? JSON.parse(options.body as string) : undefined)
      case 'patch':
        return mockApi.patch<T>(url.replace(BASE_URL, ''), options?.body ? JSON.parse(options.body as string) : undefined)
      case 'delete':
        return mockApi.delete<T>(url.replace(BASE_URL, ''))
      default:
        return mockApi.get<T>(url.replace(BASE_URL, ''))
    }
  }
}

export const api = {
  get<T>(path: string): Promise<T> {
    return fetchWithFallback<T>(`${BASE_URL}${path}`, { headers: buildHeaders() })
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return fetchWithFallback<T>(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    })
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return fetchWithFallback<T>(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    })
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return fetchWithFallback<T>(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    })
  },

  delete<T>(path: string): Promise<T> {
    return fetchWithFallback<T>(`${BASE_URL}${path}`, { method: 'DELETE', headers: buildHeaders() })
  },

  postFormData<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {}
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    return fetchWithFallback<T>(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData })
  },
}
