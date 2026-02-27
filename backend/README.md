# E-commerce Backend Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your company's database and Redis credentials.

3. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Environment Variables

The project requires a `.env` file with the following variables:

- **Database:** PostgreSQL connection details
- **Redis:** Connection configuration
- **JWT:** Secret key for authentication
- **CORS:** Frontend URL for cross-origin requests

⚠️ **Important:** Never commit the `.env` file! Use `.env.example` as a template.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/verify` - Verify JWT token

### Health Check
- `GET /` - Server health status

## Security Features

- JWT authentication with 1-hour expiration
- Role-based access control (buyer, seller, admin)
- Rate limiting on all endpoints
- SQL injection prevention with parameterized queries
- Password hashing with bcrypt
- CORS protection
- Helmet security headers

## Database Setup

The application automatically creates the necessary tables on startup. Just ensure your PostgreSQL database is running and accessible with the credentials in your `.env` file.

## Redis Setup

Redis is used for session caching and token blacklisting. Make sure Redis is running locally or update the Redis configuration in your `.env` file.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js          # PostgreSQL configuration
│   │   └── redis.js       # Redis configuration
│   ├── controllers/
│   │   └── authController.js  # Authentication logic
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT verification
│   │   └── roleMiddleware.js  # Role-based access
│   ├── routes/
│   │   └── authRoutes.js      # Authentication routes
│   └── app.js               # Express app setup
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
└── server.js               # Server entry point
```

## Development

The server will automatically restart on file changes when using `npm run dev`.

## Security Notes

- Change the JWT_SECRET in production
- Use strong database passwords
- Enable SSL in production
- Regularly update dependencies
