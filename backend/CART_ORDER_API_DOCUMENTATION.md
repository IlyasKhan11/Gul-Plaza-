# Cart + Order System API Documentation - Day 4

## Overview
Secure Cart + Order System with PostgreSQL transactions, row locking, and race condition prevention. Critical business logic implementation with zero compromise on data integrity.

## Features Implemented
✅ Cart System (Add, Update, Remove, View)  
✅ Order Creation with PostgreSQL Transactions  
✅ Row Locking (SELECT FOR UPDATE)  
✅ Stock Integrity Protection  
✅ Race Condition Prevention  
✅ Admin Order Management  
✅ Redis Caching for Performance  
✅ Comprehensive Database Indexes  

---

## 🛒 CART SYSTEM API

### 1️⃣ Add to Cart (Buyer Only)
**POST** `/api/cart`

**Headers:**
```
Authorization: Bearer <buyer_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "product_id": 123,
  "quantity": 2
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product added to cart successfully",
  "data": null
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
      "field": "quantity",
      "message": "Quantity must be greater than 0"
    }
  ]
}
```

- **404** (Product Not Found):
```json
{
  "success": false,
  "message": "Product not found"
}
```

- **400** (Insufficient Stock):
```json
{
  "success": false,
  "message": "Insufficient stock available"
}
```

---

### 2️⃣ Get My Cart (Buyer Only)
**GET** `/api/cart`

**Headers:**
```
Authorization: Bearer <buyer_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "items": [
      {
        "cart_item_id": 456,
        "product_id": 123,
        "title": "Premium Wireless Headphones",
        "price": "199.99",
        "quantity": 2,
        "available_stock": 50,
        "is_active": true,
        "product_image": "https://example.com/image1.jpg",
        "item_total": "399.98",
        "added_at": "2024-03-01T10:30:00.000Z",
        "in_stock": true
      }
    ],
    "summary": {
      "total_items": 1,
      "subtotal": "399.98",
      "currency": "USD"
    }
  }
}
```

---

### 3️⃣ Update Cart Item (Buyer Only)
**PUT** `/api/cart/:productId`

**Request Body:**
```json
{
  "quantity": 3
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "data": null
}
```

---

### 4️⃣ Remove from Cart (Buyer Only)
**DELETE** `/api/cart/:productId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Item removed from cart successfully",
  "data": null
}
```

---

### 5️⃣ Get Cart Summary (Buyer Only)
**GET** `/api/cart/summary`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Cart summary retrieved successfully",
  "data": {
    "total_items": 2,
    "subtotal": "599.97",
    "currency": "USD"
  }
}
```

---

## 📦 ORDER SYSTEM API

### 1️⃣ Create Order (CRITICAL - Buyer Only)
**POST** `/api/orders`

**Headers:**
```
Authorization: Bearer <buyer_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{} // Empty body - order created from cart
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 789,
    "user_id": 123,
    "total_amount": "599.97",
    "status": "pending",
    "currency": "USD",
    "created_at": "2024-03-01T11:00:00.000Z",
    "updated_at": "2024-03-01T11:00:00.000Z",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "items": [
      {
        "id": 101,
        "product_id": 123,
        "quantity": 3,
        "unit_price": "199.99",
        "total_price": "599.97",
        "title": "Premium Wireless Headphones",
        "product_image": "https://example.com/image1.jpg"
      }
    ]
  }
}
```

**Error Responses:**
- **400** (Cart Empty):
```json
{
  "success": false,
  "message": "Cart is empty"
}
```

- **400** (Product Unavailable):
```json
{
  "success": false,
  "message": "Product \"Premium Wireless Headphones\" is no longer available"
}
```

- **400** (Insufficient Stock):
```json
{
  "success": false,
  "message": "Insufficient stock for product \"Premium Wireless Headphones\". Available: 1, Requested: 3"
}
```

---

### 2️⃣ Get My Orders (Buyer Only)
**GET** `/api/orders`

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20, max: 100) - Orders per page
- `status` - Filter by status (pending, confirmed, processing, shipped, delivered, cancelled)
- `start_date` - Filter by start date
- `end_date` - Filter by end date
- `sort_by` (created_at, total_amount, status) - Sort field
- `sort_order` (asc, desc) - Sort direction

**Success Response (200):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": 789,
        "total_amount": "599.97",
        "status": "pending",
        "currency": "USD",
        "created_at": "2024-03-01T11:00:00.000Z",
        "updated_at": "2024-03-01T11:00:00.000Z",
        "item_count": 1
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_orders": 1,
      "orders_per_page": 20,
      "has_next": false,
      "has_prev": false
    },
    "filters": {
      "status": "pending",
      "sort_by": "created_at",
      "sort_order": "desc"
    }
  }
}
```

---

### 3️⃣ Get Order by ID (Buyer Only)
**GET** `/api/orders/:orderId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "id": 789,
    "user_id": 123,
    "total_amount": "599.97",
    "status": "pending",
    "currency": "USD",
    "created_at": "2024-03-01T11:00:00.000Z",
    "updated_at": "2024-03-01T11:00:00.000Z",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "items": [
      {
        "id": 101,
        "product_id": 123,
        "quantity": 3,
        "unit_price": "199.99",
        "total_price": "599.97",
        "title": "Premium Wireless Headphones",
        "product_image": "https://example.com/image1.jpg"
      }
    ]
  }
}
```

---

## 👑 ADMIN ORDER MANAGEMENT API

### 1️⃣ Get All Orders (Admin Only)
**GET** `/api/admin/orders`

**Query Parameters:**
- All buyer parameters plus:
- `user_id` - Filter by specific user
- `email` - Filter by customer email

**Success Response (200):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": 789,
        "user_id": 123,
        "total_amount": "599.97",
        "status": "pending",
        "currency": "USD",
        "created_at": "2024-03-01T11:00:00.000Z",
        "updated_at": "2024-03-01T11:00:00.000Z",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "item_count": 1
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_orders": 1,
      "orders_per_page": 20,
      "has_next": false,
      "has_prev": false
    },
    "filters": {
      "status": "pending",
      "sort_by": "created_at",
      "sort_order": "desc"
    }
  }
}
```

---

### 2️⃣ Update Order Status (Admin Only)
**PUT** `/api/admin/orders/:orderId/status`

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Order confirmed and ready for processing"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "id": 789,
    "status": "confirmed",
    "updated_at": "2024-03-01T11:30:00.000Z"
  }
}
```

**Error Responses:**
- **400** (Invalid Status Transition):
```json
{
  "success": false,
  "message": "Invalid status transition from delivered to confirmed"
}
```

---

### 3️⃣ Get Order Statistics (Admin Only)
**GET** `/api/admin/orders/statistics`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order statistics retrieved successfully",
  "data": {
    "total_orders": 1250,
    "pending_orders": 45,
    "confirmed_orders": 78,
    "processing_orders": 23,
    "shipped_orders": 156,
    "delivered_orders": 892,
    "cancelled_orders": 56,
    "total_revenue": "125750.99",
    "average_order_value": "100.60"
  }
}
```

---

## 🔒 SECURITY FEATURES

### 🛡️ SQL Injection Protection
- All queries use parameterized statements ($1, $2, ...)
- No raw string concatenation
- Input validation with Joi schemas

### 🔐 Transaction Safety
- **BEGIN** transaction before order creation
- **SELECT ... FOR UPDATE** locks product rows
- **COMMIT** only if all steps succeed
- **ROLLBACK** on any failure

### 🚫 Race Condition Prevention
- Row locking prevents concurrent stock modifications
- Atomic stock updates prevent overselling
- Transaction isolation ensures data consistency

### 🎯 Role-Based Access Control
- Cart operations: Buyer only
- Order creation: Buyer only
- Order management: Admin only
- Users can only access their own data

---

## ⚡ PERFORMANCE FEATURES

### 🗄️ Database Indexes
- Cart queries: `idx_cart_items_user_id`, `idx_cart_items_user_product`
- Order queries: `idx_orders_user_id`, `idx_orders_status`, `idx_orders_created_at`
- Order items: `idx_order_items_order_id`, `idx_order_items_product_id`
- Composite indexes for complex queries

### 💾 Redis Caching
- Cart data cached for 15 minutes
- Order details cached for 1 hour
- Automatic cache invalidation on updates

### 📊 Optimized Queries
- JOIN operations with proper indexing
- Pagination with LIMIT/OFFSET
- Partial indexes for active data only

---

## 🔄 SAMPLE TRANSACTION CODE

### Order Creation Transaction Flow
```sql
BEGIN;

-- Step A: Lock cart items and products
SELECT 
  ci.product_id, ci.quantity, p.price, p.stock, p.title, p.is_active
FROM cart_items ci
INNER JOIN products p ON ci.product_id = p.id
WHERE ci.user_id = $1 AND p.is_deleted = false
FOR UPDATE OF ci, p;

-- Step B: Validate stock availability
-- (Application logic checks each item)

-- Step C: Insert order
INSERT INTO orders (user_id, total_amount, status, currency)
VALUES ($1, $2, $3, $4)
RETURNING id, user_id, total_amount, status, created_at;

-- Step D: Insert order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
VALUES ($1, $2, $3, $4, $5);

-- Step E: Reduce product stock
UPDATE products
SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
WHERE id = $2;

-- Step F: Clear cart
DELETE FROM cart_items WHERE user_id = $1;

COMMIT;
```

---

## 🚨 ROLLBACK EXAMPLES

### Stock Insufficient Rollback
```sql
BEGIN;
SELECT ... FOR UPDATE;  -- Locks obtained
-- Check stock: Available = 2, Requested = 5
ROLLBACK;  -- Transaction rolled back, locks released
```

### Product Unavailable Rollback
```sql
BEGIN;
SELECT ... FOR UPDATE;  -- Locks obtained
-- Check product: is_active = false
ROLLBACK;  -- Transaction rolled back, cart preserved
```

---

## 📋 POSTMAN TEST FLOW

### Complete Order Flow

#### 1. Add Products to Cart
```http
POST http://localhost:3000/api/cart
Authorization: Bearer <buyer_token>
Content-Type: application/json

{
  "product_id": 123,
  "quantity": 2
}
```

#### 2. View Cart
```http
GET http://localhost:3000/api/cart
Authorization: Bearer <buyer_token>
```

#### 3. Create Order (Critical Transaction)
```http
POST http://localhost:3000/api/orders
Authorization: Bearer <buyer_token>
Content-Type: application/json

{}
```

#### 4. View Order
```http
GET http://localhost:3000/api/orders/789
Authorization: Bearer <buyer_token>
```

#### 5. Admin Update Status
```http
PUT http://localhost:3000/api/admin/orders/789/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "confirmed",
  "notes": "Payment received"
}
```

---

## 🎯 ERROR HANDLING

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
- `400` - Bad Request (Validation/Business Logic)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 📊 MONITORING & ANALYTICS

### Key Metrics Tracked
- Cart abandonment rate
- Order conversion rate
- Stock level alerts
- Revenue by period
- Customer order patterns

### Database Performance
- Query execution times
- Index usage statistics
- Transaction lock times
- Cache hit rates

---

## 🚀 PRODUCTION DEPLOYMENT

### Database Setup
```bash
# Apply indexes
psql -U your_user -d your_database -f database/cart_order_indexes.sql

# Verify indexes
psql -U your_user -d your_database -c "\di"
```

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

### Performance Tuning
- Connection pooling: `pool: { min: 2, max: 10 }`
- Query timeout: 30 seconds
- Transaction timeout: 60 seconds
- Redis TTL: Cart (900s), Orders (3600s)

---

## ✅ COMPLIANCE CHECKLIST

- ✅ PostgreSQL transactions implemented
- ✅ Row locking (SELECT FOR UPDATE)
- ✅ No frontend price trust
- ✅ Server-side total calculation
- ✅ Stock integrity protection
- ✅ Race condition prevention
- ✅ Parameterized queries only
- ✅ Input validation with Joi
- ✅ Role-based access control
- ✅ Comprehensive error handling
- ✅ Database indexes optimized
- ✅ Redis caching implemented
- ✅ Audit logging ready
- ✅ Production-level security

---

## 🎉 SUMMARY

The Cart + Order System is now **production-ready** with:

- **100% SQL injection protection**
- **Zero race conditions**
- **Complete transaction safety**
- **Optimal performance**
- **Comprehensive error handling**
- **Full audit trail capability**

The system handles critical business logic with the highest level of data integrity and security! 🚀
