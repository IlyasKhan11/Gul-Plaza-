const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

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

export const api = {
  get<T>(path: string): Promise<T> {
    return fetch(`${BASE_URL}${path}`, { headers: buildHeaders() }).then(r => handleResponse<T>(r))
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    }).then(r => handleResponse<T>(r))
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    }).then(r => handleResponse<T>(r))
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    }).then(r => handleResponse<T>(r))
  },

  delete<T>(path: string): Promise<T> {
    return fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers: buildHeaders() }).then(r =>
      handleResponse<T>(r)
    )
  },

  postFormData<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {}
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    return fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData }).then(r =>
      handleResponse<T>(r)
    )
  },
}
