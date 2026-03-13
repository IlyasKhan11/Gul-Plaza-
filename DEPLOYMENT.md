# Gul Plaza E-Commerce Deployment Guide

This guide covers deploying the Gul Plaza e-commerce platform with Docker, PostgreSQL, Redis, and Cloudinary integration.

## Prerequisites

- Docker and Docker Compose installed
- Cloudinary account (for image storage)
- Domain name (optional, for production)
- SSL certificates (optional, for HTTPS)

## Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables:**
   ```bash
   nano .env
   ```

   Required variables:
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL credentials
   - `JWT_SECRET` - Secure random string for JWT tokens
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Cloudinary credentials
   - `FRONTEND_URL` - Your frontend URL (e.g., https://yourdomain.com)

## Cloudinary Setup

1. **Create a Cloudinary account** at https://cloudinary.com
2. **Get your credentials** from the Cloudinary dashboard:
   - Cloud name
   - API key
   - API secret
3. **Update your `.env` file** with these credentials

## Database Migration

The application includes automatic database schema creation and migrations. New tables and columns will be created automatically when the application starts.

For the Cloudinary integration, a migration has been added to add the `public_id` column to the `product_images` table.

## Deployment Options

### Option 1: Development Deployment

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f
```

### Option 2: Production Deployment

```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Option 3: Local Development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Database services
docker-compose up postgres redis -d
```

## Production Configuration

### SSL/HTTPS Setup

1. **Obtain SSL certificates** (Let's Encrypt recommended)
2. **Place certificates** in `nginx/ssl/` directory:
   ```
   nginx/ssl/cert.pem
   nginx/ssl/key.pem
   ```
3. **Update nginx configuration** if needed

### Nginx Configuration

The production setup includes Nginx as a reverse proxy with:
- Static file serving
- API proxying to backend
- Gzip compression
- Security headers
- Rate limiting

### Database Backups

Set up automated backups for PostgreSQL:

```bash
# Backup database
docker exec gul_plaza_postgres_prod pg_dump -U postgres gul_plaza_db > backup.sql

# Restore database
docker exec -i gul_plaza_postgres_prod psql -U postgres gul_plaza_db < backup.sql
```

## Monitoring and Maintenance

### Health Checks

All services include health checks:
- Backend: `GET /`
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Scaling

To scale the backend:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## Troubleshooting

### Common Issues

1. **Database connection failed:**
   - Check PostgreSQL is running: `docker ps`
   - Verify database credentials in `.env`
   - Check database logs: `docker-compose logs postgres`

2. **Cloudinary upload failed:**
   - Verify Cloudinary credentials in `.env`
   - Check Cloudinary account limits
   - Review backend logs for specific errors

3. **Frontend not loading:**
   - Check Nginx configuration
   - Verify build process completed successfully
   - Check frontend logs: `docker-compose logs frontend`

### Performance Optimization

1. **Database:**
   - Add indexes for frequently queried columns
   - Monitor slow queries
   - Consider read replicas for high traffic

2. **Images:**
   - Cloudinary automatically optimizes images
   - Configure appropriate quality settings
   - Use WebP format when possible

3. **Caching:**
   - Redis is configured for application caching
   - Nginx caches static assets
   - Consider CDN for global distribution

## Security Considerations

1. **Environment Variables:** Never commit `.env` to version control
2. **Database:** Use strong passwords and limit network access
3. **API:** Rate limiting is configured but may need adjustment
4. **SSL:** Always use HTTPS in production
5. **Updates:** Regularly update Docker images and dependencies
