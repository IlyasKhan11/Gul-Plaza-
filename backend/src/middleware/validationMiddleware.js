const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

// Sanitization helpers
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/[<>]/g, '');
};

const sanitizeEmail = (value) => {
  if (typeof value !== 'string') return value;
  return value.toLowerCase().trim();
};

const sanitizeNumber = (value) => {
  if (typeof value === 'string') {
    const num = value.replace(/[^\d.-]/g, '');
    return parseFloat(num);
  }
  return value;
};

// Common validation chains
const validateEmail = (field = 'email') => {
  return body(field)
    .isEmail()
    .withMessage(`${field} must be a valid email address`)
    .normalizeEmail()
    .customSanitizer(sanitizeEmail);
};

const validatePassword = (field = 'password') => {
  return body(field)
    .isLength({ min: 8, max: 128 })
    .withMessage(`${field} must be between 8 and 128 characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(`${field} must contain at least one uppercase letter, one lowercase letter, one number, and one special character`);
};

const validateName = (field = 'name') => {
  return body(field)
    .isLength({ min: 2, max: 100 })
    .withMessage(`${field} must be between 2 and 100 characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`)
    .customSanitizer(sanitizeString);
};

const validatePhone = (field = 'phone') => {
  return body(field)
    .isLength({ min: 10, max: 20 })
    .withMessage(`${field} must be between 10 and 20 characters`)
    .matches(/^[+]?[\d\s()-]+$/)
    .withMessage(`${field} must be a valid phone number`);
};

const validatePrice = (field = 'price') => {
  return body(field)
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage(`${field} must be a positive number less than 1,000,000`)
    .customSanitizer(sanitizeNumber);
};

const validateStock = (field = 'stock') => {
  return body(field)
    .isInt({ min: 0, max: 999999 })
    .withMessage(`${field} must be a non-negative integer less than 1,000,000`)
    .customSanitizer(sanitizeNumber);
};

const validateId = (field = 'id') => {
  return param(field)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`);
};

const validatePagination = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

const validateDateRange = () => [
  query('start_date')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('end_date')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      const startDate = new Date(req.query.start_date);
      const endDate = new Date(value);
      if (endDate < startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
];

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));
    
    throw new ValidationError('Validation failed', validationErrors);
  }
  next();
};

// Specific validation rules for different endpoints
const userRegistrationValidation = [
  validateName('name'),
  validateEmail(),
  validatePassword(),
  validatePhone(),
  body('role')
    .optional()
    .isIn(['buyer', 'seller'])
    .withMessage('Role must be either buyer or seller'),
  handleValidationErrors,
];

const userLoginValidation = [
  validateEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

const productCreationValidation = [
  body('title')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .customSanitizer(sanitizeString),
  body('description')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters')
    .customSanitizer(sanitizeString),
  validatePrice(),
  validateStock(),
  body('category_id')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('store_id')
    .isInt({ min: 1 })
    .withMessage('Store ID must be a positive integer'),
  handleValidationErrors,
];

const orderCreationValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.product_id')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('payment_method')
    .isIn(['offline', 'online'])
    .withMessage('Payment method must be either offline or online'),
  handleValidationErrors,
];

const categoryValidation = [
  body('name')
    .isLength({ min: 2, max: 150 })
    .withMessage('Name must be between 2 and 150 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage('Name can only contain letters, numbers, spaces, and hyphens')
    .customSanitizer(sanitizeString),
  body('slug')
    .optional()
    .isLength({ min: 2, max: 150 })
    .withMessage('Slug must be between 2 and 150 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('parent_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent ID must be a positive integer'),
  handleValidationErrors,
];

// Security validation for sensitive operations
const validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  validatePassword('new_password'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  handleValidationErrors,
];

const validateEmailChange = [
  validateEmail('new_email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required to change email'),
  handleValidationErrors,
];

// Middleware to check for suspicious activity
const detectSuspiciousActivity = (req, res, next) => {
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ];

  const checkObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(obj[key])) {
            const error = new Error('Suspicious content detected');
            error.statusCode = 400;
            throw error;
          }
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        checkObject(obj[key]);
      }
    }
  };

  try {
    checkObject(req.body);
    checkObject(req.query);
    checkObject(req.params);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Basic validators
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validatePrice,
  validateStock,
  validateId,
  validatePagination,
  validateDateRange,
  
  // Validation handlers
  handleValidationErrors,
  detectSuspiciousActivity,
  
  // Predefined validation sets
  userRegistrationValidation,
  userLoginValidation,
  productCreationValidation,
  orderCreationValidation,
  categoryValidation,
  validatePasswordChange,
  validateEmailChange,
  
  // Sanitization helpers
  sanitizeString,
  sanitizeEmail,
  sanitizeNumber,
};
