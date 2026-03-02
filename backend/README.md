# Gul Plaza - Multi-Vendor E-Commerce Backend

A secure, scalable backend for a multi-vendor e-commerce platform supporting manual payment methods (COD and Bank Transfer).

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your database and Redis credentials.

3. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📋 Environment Variables

Required variables in `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gul_plaza
DB_USER=your_username
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=1h

# Server
PORT=5000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
```

## 🔐 Security Features

- **JWT Authentication** with 1-hour expiration
- **Role-Based Access Control** (buyer, seller, admin)
- **Rate Limiting** on all endpoints
- **SQL Injection Prevention** with parameterized queries
- **Password Hashing** with bcrypt
- **CORS Protection** with configurable origins
- **Helmet Security Headers**
- **Input Validation** with express-validator

## 📊 Database Schema

### Core Tables
- **users** - User accounts with role-based access
- **stores** - Seller stores with approval workflow
- **categories** - Product categories with hierarchy
- **products** - Product catalog with inventory management
- **product_images** - Product image gallery
- **cart_items** - Shopping cart system
- **orders** - Order management with payment tracking
- **order_items** - Order line items
- **payment_verifications** - Audit trail for bank transfers

### Payment System
- **COD (Cash on Delivery)** - Orders confirmed immediately
- **Bank Transfer** - Manual verification by admin before shipping
- **Payment Status Tracking** - PENDING → VERIFIED
- **Order Status Flow** - PENDING → CONFIRMED/AWAITING_VERIFICATION → PAID → SHIPPED → DELIVERED

## 🛠 API Endpoints

### Authentication
```
POST /api/auth/register     - Register new user
POST /api/auth/login        - User login
POST /api/auth/logout       - User logout
GET  /api/auth/profile      - Get user profile
GET  /api/auth/verify       - Verify JWT token
```

### Users
```
GET  /api/users/profile     - Get user profile
PUT  /api/users/profile     - Update user profile
```

### Products
```
GET    /api/products           - List products with filters
GET    /api/products/:id       - Get product details
POST   /api/products           - Create product (seller)
PUT    /api/products/:id       - Update product (seller)
DELETE /api/products/:id       - Delete product (seller)
```

### Categories
```
GET  /api/categories          - List categories
POST /api/categories          - Create category (admin)
PUT  /api/categories/:id      - Update category (admin)
```

### Cart
```
GET    /api/cart              - Get cart items
POST   /api/cart/add          - Add to cart
PUT    /api/cart/:id          - Update cart quantity
DELETE /api/cart/:id          - Remove from cart
DELETE /api/cart              - Clear cart
```

### Orders
```
POST   /api/orders                    - Create order from cart
GET    /api/orders                    - Get user orders
GET    /api/orders/:orderId           - Get order details
POST   /api/orders/:id/select-payment - Select payment method
```

### Admin
```
GET    /api/admin/orders              - Get all orders
GET    /api/admin/orders/:orderId     - Get order details
PUT    /api/admin/orders/:orderId/status - Update order status
PATCH  /api/admin/orders/:id/verify  - Verify bank transfer payment
PATCH  /api/admin/orders/:id/ship     - Ship order
GET    /api/admin/orders/statistics   - Order statistics
GET    /api/admin/users               - User management
POST   /api/admin/categories          - Category management
```

### Sellers
```
GET  /api/sellers/dashboard      - Seller dashboard
GET  /api/sellers/products       - Seller products
GET  /api/sellers/orders         - Seller orders
POST /api/sellers/store          - Create/update store
```

## 🗂 Database Setup

### Automatic Setup
The application automatically creates tables on startup. Just ensure PostgreSQL is running.

### Manual Schema Updates
Run SQL files in order:
```bash
psql -d gul_plaza -f database/indexes.sql
psql -d gul_plaza -f database/cart_order_indexes.sql
psql -d gul_plaza -f database/payment_schema_update.sql
```

### Key Indexes
- **Products**: Category, store, search, price, stock
- **Orders**: User, status, date, amount
- **Cart**: User-product combinations
- **Analytics**: Revenue, sales tracking

## 🏗 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js              # PostgreSQL configuration
│   │   └── redis.js           # Redis configuration
│   ├── controllers/
│   │   ├── authController.js   # Authentication logic
│   │   ├── productController.js # Product management
│   │   ├── orderController.js   # Order processing
│   │   ├── cartController.js    # Shopping cart
│   │   └── adminController.js   # Admin operations
│   ├── helpers/
│   │   └── orderStateValidation.js # Payment state machine
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification
│   │   ├── roleMiddleware.js    # Role-based access
│   │   └── validationMiddleware.js # Input validation
│   ├── routes/
│   │   ├── authRoutes.js       # Authentication endpoints
│   │   ├── productRoutes.js    # Product endpoints
│   │   ├── orderRoutes.js      # Order endpoints
│   │   └── adminRoutes.js      # Admin endpoints
│   ├── services/
│   │   ├── orderService.js      # Order business logic
│   │   └── productService.js    # Product operations
│   ├── validations/
│   │   └── orderValidation.js   # Input schemas
│   └── app.js                  # Express app setup
├── database/
│   ├── indexes.sql             # Core database indexes
│   ├── cart_order_indexes.sql   # Cart/order optimization
│   └── payment_schema_update.sql # Payment system schema
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies and scripts
└── server.js                   # Server entry point
```

## 💳 Payment Flow

### COD (Cash on Delivery)
1. Customer places order
2. Selects COD payment method
3. Order status: **CONFIRMED**
4. Admin ships order
5. Order status: **SHIPPED** → **DELIVERED**
6. Payment collected on delivery

### Bank Transfer
1. Customer places order
2. Selects Bank Transfer payment method
3. Order status: **AWAITING_VERIFICATION**
4. Customer transfers payment
5. Admin verifies payment
6. Order status: **PAID**
7. Admin ships order
8. Order status: **SHIPPED** → **DELIVERED**

## 🔧 Development

### Running Tests
```bash
npm test
```

### Database Migrations
```bash
# Run schema updates
npm run migrate
```

### Environment-Specific Config
- **Development**: Detailed logging, relaxed CORS
- **Production**: Optimized logging, strict CORS, security headers

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT_SECRET
- [ ] Enable SSL/TLS
- [ ] Configure reverse proxy (nginx)
- [ ] Set up database backups
- [ ] Configure monitoring
- [ ] Update CORS origins
- [ ] Use production database credentials

### Docker Support
```dockerfile
# Build
docker build -t gul-plaza-backend .

# Run
docker run -p 5000:5000 gul-plaza-backend
```

## 📈 Performance Features

- **Database Indexing** for fast queries
- **Redis Caching** for sessions
- **Connection Pooling** for database
- **Rate Limiting** for API protection
- **Compression** for responses
- **Query Optimization** with proper joins

## 🛡 Security Best Practices

- Never commit `.env` files
- Use environment variables for secrets
- Regularly update dependencies
- Implement proper logging
- Use HTTPS in production
- Validate all inputs
- Sanitize database queries
- Implement proper error handling

## 📞 Support

For issues and questions:
1. Check the logs for error details
2. Verify environment variables
3. Ensure database and Redis are running
4. Review API endpoint documentation

---

**Version**: 1.0.0  
**Last Updated**: 2026-03-03  
**Node.js**: >=18.0.0  
**Database**: PostgreSQL 13+  
**Cache**: Redis 6+
