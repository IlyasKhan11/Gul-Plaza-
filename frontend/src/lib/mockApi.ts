// Mock API responses for development when backend is not available
const mockCategories = [
  { id: 1, name: 'Electronics', slug: 'electronics', parent_id: null, sample_image: null },
  { id: 2, name: 'Fashion', slug: 'fashion', parent_id: null, sample_image: null },
  { id: 3, name: 'Home & Living', slug: 'home-living', parent_id: null, sample_image: null },
  { id: 4, name: 'Books', slug: 'books', parent_id: null, sample_image: null },
  { id: 5, name: 'Sports', slug: 'sports', parent_id: null, sample_image: null },
  { id: 6, name: 'Beauty', slug: 'beauty', parent_id: null, sample_image: null },
  { id: 7, name: 'Groceries', slug: 'groceries', parent_id: null, sample_image: null },
  { id: 8, name: 'Toys', slug: 'toys', parent_id: null, sample_image: null },
]

const mockProducts = [
  {
    id: 1,
    title: 'Wireless Headphones',
    name: 'Wireless Headphones',
    price: 2999,
    primary_image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'],
    description: 'High quality wireless headphones with noise cancellation',
  },
  {
    id: 2,
    title: 'Smart Watch',
    name: 'Smart Watch',
    price: 4999,
    primary_image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'],
    description: 'Feature-rich smartwatch with health tracking',
  },
  {
    id: 3,
    title: 'Laptop Backpack',
    name: 'Laptop Backpack',
    price: 1499,
    primary_image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300'],
    description: 'Durable backpack with laptop compartment',
  },
  {
    id: 4,
    title: 'Running Shoes',
    name: 'Running Shoes',
    price: 3999,
    primary_image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300'],
    description: 'Comfortable running shoes for all terrains',
  },
]

const mockStores = [
  {
    id: 1,
    owner_id: 1,
    name: 'Tech Store',
    logo_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100',
    banner_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
    description: 'Your trusted electronics store',
    product_count: 150,
  },
  {
    id: 2,
    owner_id: 2,
    name: 'Fashion Hub',
    logo_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100',
    banner_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    description: 'Latest fashion trends',
    product_count: 200,
  },
]

export const mockApi = {
  async get<T>(path: string): Promise<T> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (path === '/api/categories') {
      return { success: true, data: mockCategories } as T
    }
    
    if (path.includes('/api/products')) {
      return { 
        success: true, 
        data: { 
          products: mockProducts 
        } 
      } as T
    }
    
    if (path.includes('/api/sellers/stores')) {
      return { success: true, data: mockStores } as T
    }
    
    // Return empty response for other endpoints
    return { success: true, data: [] } as T
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true, data: {} } as T
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true, data: {} } as T
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true, data: {} } as T
  },

  async delete<T>(path: string): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true, data: {} } as T
  },

  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true, data: {} } as T
  },
}
