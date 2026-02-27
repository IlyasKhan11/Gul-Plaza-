const redis = require('redis');

// Redis client configuration
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('Redis server connection refused');
      return new Error('Redis server connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.error('Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      console.error('Redis max retry attempts reached');
      return undefined;
    }
    // Retry after 3 seconds
    return Math.min(options.attempt * 100, 3000);
  },
});

// Redis event handlers
redisClient.on('connect', () => {
  console.log('Connected to Redis server');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

redisClient.on('end', () => {
  console.log('Redis client disconnected');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    // Skip Redis if not available
    if (process.env.SKIP_REDIS === 'true') {
      console.log('Redis skipped (SKIP_REDIS=true)');
      return;
    }
    
    await redisClient.connect();
    console.log('Redis connection established');
  } catch (error) {
    console.warn('Redis connection failed, continuing without Redis:', error.message);
    // Don't throw error, just continue without Redis
  }
};

// Helper functions for Redis operations
const setCache = async (key, value, expireInSeconds = 3600) => {
  try {
    await redisClient.setEx(key, expireInSeconds, JSON.stringify(value));
    console.log(`Cache set for key: ${key}`);
  } catch (error) {
    console.error('Error setting cache:', error);
    throw error;
  }
};

const getCache = async (key) => {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
    console.log(`Cache deleted for key: ${key}`);
  } catch (error) {
    console.error('Error deleting cache:', error);
    throw error;
  }
};

// Graceful shutdown
const closeRedisConnection = async () => {
  try {
    await redisClient.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
};

module.exports = {
  redisClient,
  connectRedis,
  setCache,
  getCache,
  deleteCache,
  closeRedisConnection,
};
