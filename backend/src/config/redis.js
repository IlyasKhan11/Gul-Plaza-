const redis = require('redis');

// Redis v4 Configuration
const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis max retry attempts reached');
        return new Error('Max retries reached');
      }
      return Math.min(retries * 100, 3000); // Retry after up to 3 seconds
    }
  }
});

// Track Redis connection state
let isRedisReady = false;

// Redis event handlers
redisClient.on('connect', () => {
  console.log('Connected to Redis server');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
  isRedisReady = true;
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
  isRedisReady = false;
});

redisClient.on('end', () => {
  console.log('Redis client disconnected');
  isRedisReady = false;
});

// Connect to Redis
const connectRedis = async () => {
  try {
    if (process.env.SKIP_REDIS === 'true') {
      console.log('Redis skipped (SKIP_REDIS=true)');
      return;
    }
    
    await redisClient.connect();
    console.log('Redis connection established');
  } catch (error) {
    console.warn('Redis connection failed, continuing without Redis:', error.message);
    isRedisReady = false;
  }
};

// Safe Helper Functions
const setCache = async (key, value, expireInSeconds = 3600) => {
  if (!isRedisReady) return;
  try {
    await redisClient.setEx(key, expireInSeconds, JSON.stringify(value));
    console.log(`Cache set for key: ${key}`);
  } catch (error) {
    console.error(`Failed to set cache for ${key}:`, error.message);
    // DO NOT throw error here if you want the app to survive Redis outages
  }
};

const getCache = async (key) => {
  if (!isRedisReady) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Failed to get cache for ${key}:`, error.message);
    return null;
  }
};

const deleteCache = async (key) => {
  if (!isRedisReady) return;
  try {
    await redisClient.del(key);
    console.log(`Cache deleted for key: ${key}`);
  } catch (error) {
    console.error(`Failed to delete cache for ${key}:`, error.message);
    // DO NOT throw error here if you want the app to survive Redis outages
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
