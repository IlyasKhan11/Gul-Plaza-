const { logError, logSecurity } = require('../config/logger');

// Custom error classes for different types of errors
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

// Error handler middleware
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log the error
  logError(err, req);

  // Log security-related errors
  if (error.statusCode === 401 || error.statusCode === 403) {
    logSecurity('Security Breach Attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      userId: req.user ? req.user.id : null,
      error: error.message,
    }, 'high');
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if (err.name === 'CastError') {
    error = handleCastError(err);
  } else if (err.code === '23505') {
    error = handleDuplicateFieldsDB(err);
  } else if (err.code === '23503') {
    error = handleForeignKeyViolation(err);
  } else if (err.code === '23502') {
    error = handleNotNullViolation(err);
  } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    error = handleJSONSyntaxError();
  }

  // Production error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    message: error.message || 'Internal server error',
    ...(error.statusCode && { status: error.status }),
    ...(error.errors && { errors: error.errors }),
    ...(isDevelopment && {
      stack: error.stack,
      error: error,
    }),
  };

  res.status(error.statusCode || 500).json(errorResponse);
};

// Specific error handlers
const handleValidationError = (err) => {
  const errors = err.errors?.map(error => ({
    field: error.path || error.param,
    message: error.msg || error.message,
    value: error.value,
  })) || [];

  return new ValidationError('Validation failed', errors);
};

const handleJWTError = () => {
  return new AuthenticationError('Invalid token. Please log in again.');
};

const handleJWTExpiredError = () => {
  return new AuthenticationError('Token expired. Please log in again.');
};

const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ValidationError(message);
};

const handleDuplicateFieldsDB = (err) => {
  const field = err.detail?.match(/Key \((.*?)\)/)?.[1] || 'field';
  const message = `Duplicate ${field}. Please use another value.`;
  return new ConflictError(message);
};

const handleForeignKeyViolation = (err) => {
  const message = 'Referenced resource does not exist or has been deleted.';
  return new ValidationError(message);
};

const handleNotNullViolation = (err) => {
  const field = err.column || 'field';
  const message = `${field} is required and cannot be null.`;
  return new ValidationError(message);
};

const handleJSONSyntaxError = () => {
  return new ValidationError('Invalid JSON format in request body.');
};

// Async error wrapper for catching unhandled promise rejections
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handler for uncaught exceptions
const handleUncaughtException = (error) => {
  console.error('Uncaught Exception:', error);
  logError(error);
  process.exit(1);
};

// Error handler for unhandled promise rejections
const handleUnhandledRejection = (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logError(new Error(reason));
  process.exit(1);
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  globalErrorHandler,
  catchAsync,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  // Custom error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  RateLimitError,
};
