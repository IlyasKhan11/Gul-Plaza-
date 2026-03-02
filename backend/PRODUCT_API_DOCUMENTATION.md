# Product API Documentation - Day 3

## Overview
Secure Product/Listing Module with role-based access control, input validation, and Redis caching.

## Features Implemented
✅ Create Product (Seller Only)  
✅ Update Product (Seller Only)  
✅ Delete Product (Seller Only - Soft Delete)  
✅ Get Single Product (Public)  
✅ Get All Products (Public with Pagination & Filtering)  
✅ Redis Caching for Performance  
✅ SQL Injection Protection  
✅ Database Indexes for Performance  

---

## API Endpoints

### 1️⃣ Create Product (Seller Only)
**POST** `/api/products`

**Headers:**
```
Authorization: Bearer <seller_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Premium Wireless Headphones",
  "description": "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
  "price": 199.99,
  "category_id": 1,
  "stock": 50,
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 123,
    "title": "Premium Wireless Headphones",
    "description": "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
    "price": "199.99",
    "stock": 50,
    "is_active": true,
    "created_at": "2024-03-01T10:30:00.000Z",
    "updated_at": "2024-03-01T10:30:00.000Z"
  }
}
```

**Error Responses:**
- **400** (Validation Error):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "price",
      "message": "Price must be greater than 0"
    }
  ]
}
```

- **401** (Unauthorized):
```json
{
  "success": false,
  "message": "Access token required"
}
```

- **403** (Forbidden):
```json
{
  "success": false,
  "message": "Seller role required"
}
```

---

### 2️⃣ Update Product (Seller Only)
**PUT** `/api/products/:id`

**Headers:**
```
Authorization: Bearer <seller_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Premium Wireless Headphones Pro",
  "price": 249.99,
  "stock": 75
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": 123,
    "title": "Premium Wireless Headphones Pro",
    "description": "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
    "price": "249.99",
    "stock": 75,
    "is_active": true,
    "created_at": "2024-03-01T10:30:00.000Z",
    "updated_at": "2024-03-01T11:15:00.000Z"
  }
}
```

---

### 3️⃣ Delete Product (Seller Only)
**DELETE** `/api/products/:id`

**Headers:**
```
Authorization: Bearer <seller_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Cannot delete product that has been ordered"
}
```

---

### 4️⃣ Get Single Product (Public)
**GET** `/api/products/:id`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": 123,
    "title": "Premium Wireless Headphones",
    "description": "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
    "price": "199.99",
    "stock": 50,
    "is_active": true,
    "created_at": "2024-03-01T10:30:00.000Z",
    "updated_at": "2024-03-01T10:30:00.000Z",
    "seller_id": 45,
    "seller_name": "TechStore",
    "seller_email": "seller@techstore.com",
    "category_id": 1,
    "category_name": "Electronics",
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ]
  }
}
```

---

### 5️⃣ Get All Products (Public)
**GET** `/api/products`

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20, max: 100) - Products per page
- `category_id` - Filter by category
- `search` - Search in title (ILIKE)
- `sort_by` (price, created_at, title, stock) - Sort field
- `sort_order` (asc, desc) - Sort direction

**Example Request:**
```
GET /api/products?page=1&limit=10&category_id=1&search=wireless&sort_by=price&sort_order=asc
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "id": 123,
        "title": "Premium Wireless Headphones",
        "description": "High-quality wireless headphones with noise cancellation...",
        "price": "199.99",
        "stock": 50,
        "is_active": true,
        "created_at": "2024-03-01T10:30:00.000Z",
        "updated_at": "2024-03-01T10:30:00.000Z",
        "seller_name": "TechStore",
        "category_name": "Electronics",
        "primary_image": "https://example.com/image1.jpg"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_products": 47,
      "products_per_page": 10,
      "has_next": true,
      "has_prev": false
    },
    "filters": {
      "category_id": 1,
      "search": "wireless",
      "sort_by": "price",
      "sort_order": "asc"
    }
  }
}
```

---

### 6️⃣ Get Seller's Products (Seller Only)
**GET** `/api/products/seller/my-products`

**Headers:**
```
Authorization: Bearer <seller_jwt_token>
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` - Search in title
- `sort_by` (price, created_at, title, stock)
- `sort_order` (asc, desc)

---

## Security Features

### 🔒 SQL Injection Protection
- All queries use parameterized statements ($1, $2, ...)
- No raw string concatenation
- Input validation with Joi schemas

### 🔐 Role-Based Access Control
- Only sellers can create/update/delete products
- JWT token authentication required
- Seller can only modify their own products

### 🛡️ Input Validation
- Title: 1-255 characters, required
- Description: 1-5000 characters, required
- Price: Positive number, required
- Category ID: Positive integer, required
- Stock: Non-negative integer, required
- Images: Array of valid URLs, max 5 images

### 🚦 Rate Limiting
- Public endpoints: 100 requests per 15 minutes
- Seller endpoints: 30 requests per 15 minutes

---

## Performance Features

### ⚡ Redis Caching
- Product details cached for 1 hour
- Product lists cached for 30 minutes
- Automatic cache invalidation on updates
- Cache keys: `product:{id}`, `products:{filters}`

### 📊 Database Indexes
- Category filtering: `idx_products_category_id`
- Seller filtering: `idx_products_store_id`
- Text search: `idx_products_title_gin`
- Soft delete: `idx_products_is_deleted`
- Price sorting: `idx_products_price`
- Date sorting: `idx_products_created_at`

---

## Sample SQL Queries Used

### Create Product
```sql
INSERT INTO products (store_id, category_id, title, description, price, stock, is_deleted)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, title, description, price, stock, is_active, created_at, updated_at
```

### Get Products with Filtering
```sql
SELECT 
  p.id, p.title, p.description, p.price, p.stock, p.is_active, 
  p.created_at, p.updated_at,
  s.name as seller_name,
  c.name as category_name,
  (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as primary_image
FROM products p
LEFT JOIN stores s ON p.store_id = s.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_deleted = false AND p.category_id = $1 AND p.title ILIKE $2
ORDER BY p.price ASC
LIMIT $3 OFFSET $4
```

### Update Product (Dynamic)
```sql
UPDATE products
SET title = COALESCE($1, title), price = COALESCE($2, price), updated_at = CURRENT_TIMESTAMP
WHERE id = $3
RETURNING id, title, description, price, stock, is_active, created_at, updated_at
```

### Soft Delete
```sql
UPDATE products
SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
```

---

## Postman Test Cases

### 1. Create Product
```http
POST http://localhost:3000/api/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Test Product",
  "description": "This is a test product",
  "price": 29.99,
  "category_id": 1,
  "stock": 100,
  "images": ["https://example.com/test.jpg"]
}
```

### 2. Get All Products
```http
GET http://localhost:3000/api/products?page=1&limit=5&category_id=1&sort_by=price&sort_order=asc
```

### 3. Get Single Product
```http
GET http://localhost:3000/api/products/123
```

### 4. Update Product
```http
PUT http://localhost:3000/api/products/123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "price": 39.99,
  "stock": 150
}
```

### 5. Delete Product
```http
DELETE http://localhost:3000/api/products/123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Only for validation errors
}
```

**HTTP Status Codes Used:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Production Considerations

✅ All inputs validated and sanitized  
✅ SQL injection protection with parameterized queries  
✅ Role-based access control  
✅ Rate limiting implemented  
✅ Redis caching for performance  
✅ Database indexes optimized  
✅ Soft delete implemented  
✅ Comprehensive error handling  
✅ Structured JSON responses  
✅ No sensitive data exposure  

---

## Installation & Setup

1. **Install Dependencies:**
```bash
npm install
```

2. **Setup Database:**
```bash
psql -U your_user -d your_database -f database/indexes.sql
```

3. **Environment Variables:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
```

4. **Start Server:**
```bash
npm run dev
```

The Product API is now ready at `/api/products`! 🚀
