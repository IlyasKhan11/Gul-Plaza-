require('dotenv').config();
const app = require('./src/app');
const { initializeDatabase } = require('./src/config/db');
const { connectRedis, closeRedisConnection } = require('./src/config/redis');

const PORT = process.env.PORT || 5000;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close Redis connection
    await closeRedisConnection();
    
    // Close database connections would go here
    // await closeDatabaseConnection();
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const startServer = async () => {
  try {
    // Start Express server first (without database dependency)
    console.log('🚀 Starting Express server...');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running securely on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/`);
    });

    // Initialize database tables (with error handling) - non-blocking
    console.log('Initializing database...');
    try {
      await initializeDatabase();
      console.log('✅ Database tables initialized successfully');
    } catch (dbError) {
      console.error('❌ Database initialization failed:', dbError.message);
      console.error('Full error:', dbError);
      // Continue without database for now
      console.log('⚠️ Server running without database - API endpoints will fail');
    }
    
    // Connect to Redis (with error handling)
    console.log('Connecting to Redis...');
    try {
      await connectRedis();
    } catch (redisError) {
      console.warn('Redis connection failed (continuing without Redis):', redisError.message);
    }
    
    console.log('⚠️  Database/Redis connection issues will be shown above');
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
