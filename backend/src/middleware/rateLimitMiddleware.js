const rateLimit = require('express-rate-limit');

// Rate limiting configurations for different endpoint types
const rateLimitConfigs = {
  // Strict rate limiting for authentication routes
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  },

  // Medium rate limiting for order creation
  orderCreation: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 order creation attempts per windowMs
    message: {
      success: false,
      message: 'Too many order creation attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Safe rate limiting for general routes
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Admin-specific rate limiting
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 admin requests per windowMs
    message: {
      success: false,
      message: 'Too many admin requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Very restrictive for sensitive operations
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 sensitive operations per hour
    message: {
      success: false,
      message: 'Too many sensitive operations, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Product creation rate limiting
  productCreation: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 product creation attempts per windowMs
    message: {
      success: false,
      message: 'Too many product creation attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
};

// Create rate limiters for different use cases
const createRateLimiter = (configName) => {
  return rateLimit(rateLimitConfigs[configName]);
};

// Pre-configured rate limiters
const authLimiter = createRateLimiter('auth');
const orderCreationLimiter = createRateLimiter('orderCreation');
const generalLimiter = createRateLimiter('general');
const adminLimiter = createRateLimiter('admin');
const sensitiveLimiter = createRateLimiter('sensitive');
const productCreationLimiter = createRateLimiter('productCreation');

// Custom rate limiter with dynamic configuration
const createCustomRateLimiter = (options) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // Default 15 minutes
    max: 100, // Default 100 requests
    message: {
      success: false,
      message: 'Rate limit exceeded, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
};

// Rate limiter that checks user role (if authenticated)
const createUserBasedRateLimiter = (configs) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      if (req.user && req.user.id) {
        return `user:${req.user.id}`;
      }
      return `ip:${req.ip}`;
    },
    handler: (req, res) => {
      const userRole = req.user ? req.user.role : 'anonymous';
      const maxRequests = configs[userRole] || configs.anonymous || 100;
      
      res.status(429).json({
        success: false,
        message: `Rate limit exceeded for ${userRole}. Maximum ${maxRequests} requests per 15 minutes.`,
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  rateLimitConfigs,
  createRateLimiter,
  authLimiter,
  orderCreationLimiter,
  generalLimiter,
  adminLimiter,
  sensitiveLimiter,
  productCreationLimiter,
  createCustomRateLimiter,
  createUserBasedRateLimiter,
};
