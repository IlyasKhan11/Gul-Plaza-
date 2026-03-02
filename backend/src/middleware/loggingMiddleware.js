const morgan = require('morgan');
const { logRequest } = require('../config/logger');

// Custom Morgan token for response time
morgan.token('response-time', (req, res) => {
  return res.responseTime || '-';
});

// Custom Morgan format that includes all necessary information
const customFormat = ':method :url :status :response-time ms - :user-agent';

// Create Morgan middleware with custom format
const httpLogger = morgan(customFormat, {
  stream: {
    write: (message) => {
      // Parse the Morgan message to extract components
      const parts = message.trim().split(' ');
      const method = parts[0];
      const url = parts[1];
      const status = parseInt(parts[2]);
      const responseTime = parts[3];
      const userAgent = parts.slice(5).join(' ').replace(/-/g, '');

      // Create a mock request and response for logging
      const mockReq = {
        method,
        originalUrl: url,
        get: (header) => header === 'User-Agent' ? userAgent : undefined,
        ip: null, // Will be set by the actual request middleware
        user: null, // Will be set by the actual request middleware
      };

      const mockRes = {
        statusCode: status,
        responseTime: responseTime === '-' ? 0 : parseInt(responseTime),
      };

      logRequest(mockReq, mockRes, mockRes.responseTime);
    },
  },
});

// Middleware to capture request start time and add user info
const requestLogger = (req, res, next) => {
  // Capture start time
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to calculate response time and log
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    res.responseTime = responseTime;

    // Log the request with actual request data
    logRequest(req, res, responseTime);

    // Call original end function
    originalEnd.apply(this, args);
  };

  next();
};

// Combined middleware that uses both Morgan and our custom logger
const combinedLogger = [
  requestLogger,
  // Only use Morgan in development for console output
  ...(process.env.NODE_ENV === 'development' ? [morgan('dev')] : []),
];

module.exports = {
  httpLogger,
  requestLogger,
  combinedLogger,
};
