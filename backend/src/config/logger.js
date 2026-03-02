const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'ecommerce-backend' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Access log file for HTTP requests
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Custom logging methods for different contexts
const logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user ? req.user.id : null,
    userRole: req.user ? req.user.role : null,
  };

  if (res.statusCode >= 400) {
    logger.error('HTTP Request Error', logData);
  } else {
    logger.http('HTTP Request', logData);
  }
};

const logError = (error, req = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    ...(req && {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : null,
      userRole: req.user ? req.user.role : null,
    }),
  };

  logger.error('Application Error', errorData);
};

const logAuth = (action, userId, email, ip, success = true) => {
  const authData = {
    action,
    userId,
    email,
    ip,
    success,
    timestamp: new Date().toISOString(),
  };

  if (success) {
    logger.info('Authentication Success', authData);
  } else {
    logger.warn('Authentication Failure', authData);
  }
};

const logDatabase = (query, params, duration, error = null) => {
  const dbData = {
    query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
    params: params ? JSON.stringify(params).substring(0, 100) : null,
    duration: `${duration}ms`,
    ...(error && { error: error.message }),
  };

  if (error) {
    logger.error('Database Query Error', dbData);
  } else {
    logger.debug('Database Query', dbData);
  }
};

const logBusiness = (action, data, userId = null) => {
  const businessData = {
    action,
    data,
    userId,
    timestamp: new Date().toISOString(),
  };

  logger.info('Business Logic', businessData);
};

const logSecurity = (event, details, severity = 'medium') => {
  const securityData = {
    event,
    details,
    severity,
    timestamp: new Date().toISOString(),
  };

  if (severity === 'high') {
    logger.error('Security Event', securityData);
  } else if (severity === 'medium') {
    logger.warn('Security Event', securityData);
  } else {
    logger.info('Security Event', securityData);
  }
};

// Performance monitoring
const logPerformance = (operation, duration, metadata = {}) => {
  const perfData = {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  };

  if (duration > 1000) {
    logger.warn('Slow Operation Detected', perfData);
  } else {
    logger.debug('Performance', perfData);
  }
};

// Create a stream for Morgan
const loggerStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = {
  logger,
  logRequest,
  logError,
  logAuth,
  logDatabase,
  logBusiness,
  logSecurity,
  logPerformance,
  loggerStream,
};
