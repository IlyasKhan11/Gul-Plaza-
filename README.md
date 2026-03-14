Gul Plaza E-Commerce Platform

A modern, full-featured e-commerce platform built with Node.js, React, PostgreSQL, and Redis. Features multi-vendor support, product management, order processing, and **Cloudinary integration for image storage**.

## 🚀 Features

### Core Features
- **Multi-vendor Marketplace**: Sellers can create stores and list products
- **Product Management**: Comprehensive product catalog with image galleries
- **Cloudinary Integration**: Cloud-based image storage with automatic optimization
- **Order Processing**: Complete order lifecycle from checkout to delivery
- **User Management**: Role-based access (Buyer, Seller, Admin)
- **Payment Integration**: Multiple payment methods (COD, EasyPaisa, JazzCash)
- **Rating & Reviews**: Customer feedback system
- **Wishlist**: Save favorite products
- **Notifications**: Real-time updates for orders and activities

### Technical Features
- **Cloudinary Images**: Automatic image optimization and CDN delivery
- **Docker Deployment**: Containerized deployment with Docker Compose
- **Database**: PostgreSQL with Redis for caching
- **API Security**: JWT authentication, rate limiting, input validation
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **Real-time Updates**: WebSocket support for live notifications

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** (primary database)
- **Redis** (caching and sessions)
- **JWT** (authentication)
- **Cloudinary** (image storage and optimization)
- **Winston** (logging)

### Frontend
- **React 19** with TypeScript
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **Radix UI** (components)
- **React Router** (navigation)
- **Axios** (API client)

### DevOps
- **Docker** & Docker Compose
- **Nginx** (reverse proxy)
- **Health checks** and monitoring

## 📋 Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16+ (if running locally)
- Redis 7+ (if running locally)
- **Cloudinary account** (for image storage)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/YOUR_USERNAME/gul-plaza.git
cd gul-plaza
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` file with your settings:
```bash
# Cloudinary (REQUIRED for images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Database
DB_NAME=gul_plaza_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_key
```

### 3. Development Setup

**Option A: Local Development**
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev

# Database (using Docker for services only)
docker-compose up postgres redis -d
```

**Option B: Railway + Vercel Deployment**
```bash
# 1. Fork and deploy to Railway (backend)
# 2. Deploy to Vercel (frontend)
# 3. Set environment variables in both platforms
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api/products/info

## 🏗️ Project Structure

```
gul-plaza/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── config/        # Database, Redis, Cloudinary config
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Auth, validation middleware
│   │   ├── routes/        # API routes
│   │   └── services/      # Business logic
│   ├── database/          # SQL migrations and schema
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React contexts
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript definitions
│   └── package.json
├── docker-compose.dev.yml  # Development services (PostgreSQL + Redis only)
├── .env.example           # Environment template
├── README.md              # Project documentation
└── DEPLOYMENT.md          # Deployment guide
```

## 📚 API Documentation

### Products API
- `GET /api/products` - List all products with filtering
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (seller only)
- `PUT /api/products/:id` - Update product (seller only)
- `DELETE /api/products/:id` - Delete product (seller only)
- `POST /api/products/upload-image` - Upload product image to Cloudinary
- `DELETE /api/products/images/:imageId` - Delete product image from Cloudinary

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Orders
- `GET /api/orders` - List user orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status

## 🖼️ Cloudinary Integration

The platform uses Cloudinary for all image storage:

### Features
- **Automatic Optimization**: Images are automatically compressed and formatted
- **Multiple Formats**: Support for JPG, PNG, WebP
- **CDN Delivery**: Fast global content delivery
- **Transformations**: On-the-fly image resizing and effects

### Setup
1. Create Cloudinary account: https://cloudinary.com
2. Get credentials from dashboard
3. Add to `.env`:
   ```bash
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. Images will be automatically uploaded to `gul-plaza/products` folder

## 🚀 Deployment

### Railway + Vercel (Recommended for Testing)
1. **Backend on Railway**:
   - Connect Railway to your GitHub repository
   - Set environment variables (Cloudinary credentials, database, JWT)
   - Railway automatically builds and deploys Node.js backend

2. **Frontend on Vercel**:
   - Connect Vercel to your GitHub repository  
   - Set `VITE_API_URL` to your Railway backend URL
   - Vercel automatically builds and deploys React frontend

### Local Development
```bash
# Start database services only
docker-compose -f docker-compose.dev.yml up -d

# Run backend locally
cd backend && npm run dev

# Run frontend locally  
cd frontend && npm run dev
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🔧 Configuration

### Environment Variables
- `NODE_ENV` - Application environment (development/production)
- `PORT` - Backend port (default: 5000)
- `DB_*` - Database connection settings
- `REDIS_*` - Redis connection settings
- `CLOUDINARY_*` - Cloudinary credentials (required for images)
- `JWT_SECRET` - JWT signing secret
- `FRONTEND_URL` - Frontend URL for CORS

### Database Schema
The application uses PostgreSQL with the following main tables:
- `users` - User accounts and profiles
- `stores` - Seller stores
- `products` - Product catalog
- `product_images` - Product image galleries (with Cloudinary URLs)
- `orders` - Order management
- `categories` - Product categories

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests (if configured)
npm run test:e2e
```

## 📈 Monitoring

### Health Checks
- Backend: `GET /`
- Database: PostgreSQL health check
- Redis: `redis-cli ping`

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
1. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
2. Review the troubleshooting section
3. Check application logs for specific errors
4. Create an issue in the repository

## 🔄 Updates

Regular updates include:
- Security patches
- Performance improvements
- New features
- Bug fixes

To update:
```bash
git pull origin main
./scripts/deploy.sh
```
