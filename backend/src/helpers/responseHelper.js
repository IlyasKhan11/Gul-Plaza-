// Response formatter utility
const formatResponse = (success, data = null, message = '', meta = {}) => {
  const response = {
    success,
    message,
    ...meta,
  };

  if (success && data !== null) {
    response.data = data;
  }

  if (!success && data !== null) {
    response.errors = data;
  }

  return response;
};

const successResponse = (data, message = 'Operation successful', meta = {}) => {
  return formatResponse(true, data, message, meta);
};

const errorResponse = (errors, message = 'Operation failed', meta = {}) => {
  return formatResponse(false, errors, message, meta);
};

const paginatedResponse = (data, pagination, message = 'Data retrieved successfully') => {
  return successResponse(data, message, { pagination });
};

// Pagination utility
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
};

const buildPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
};

// Query builder utility
const buildWhereClause = (filters = {}) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        const { operator, val } = value;
        conditions.push(`${key} ${operator} $${paramIndex++}`);
        params.push(val);
      } else {
        conditions.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
};

const buildOrderClause = (sortBy = 'created_at', sortOrder = 'DESC', allowedColumns = []) => {
  const column = allowedColumns.includes(sortBy) ? sortBy : 'created_at';
  const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return `ORDER BY ${column} ${direction}`;
};

// Data transformation utilities
const transformProduct = (product) => ({
  id: parseInt(product.id),
  title: product.title,
  description: product.description,
  price: parseFloat(product.price),
  stock: parseInt(product.stock),
  is_active: Boolean(product.is_active),
  is_deleted: Boolean(product.is_deleted),
  store_id: parseInt(product.store_id),
  category_id: parseInt(product.category_id),
  seller_id: parseInt(product.seller_id),
  created_at: product.created_at,
  updated_at: product.updated_at,
});

const transformOrder = (order) => ({
  id: parseInt(order.id),
  buyer_id: parseInt(order.buyer_id),
  user_id: parseInt(order.user_id),
  status: order.status,
  payment_status: order.payment_status,
  total_amount: parseFloat(order.total_amount),
  created_at: order.created_at,
  updated_at: order.updated_at,
});

const transformUser = (user) => {
  const { password, ...safeUser } = user;
  return {
    ...safeUser,
    id: parseInt(safeUser.id),
    is_verified: Boolean(safeUser.is_verified),
    created_at: safeUser.created_at,
    updated_at: safeUser.updated_at,
  };
};

// Validation helpers
const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  );

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
};

const validateEnum = (value, allowedValues, fieldName) => {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
};

// String utilities
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Date utilities
const formatDate = (date, format = 'ISO') => {
  const d = new Date(date);
  
  switch (format) {
    case 'ISO':
      return d.toISOString();
    case 'date':
      return d.toISOString().split('T')[0];
    case 'datetime':
      return d.toISOString().replace('T', ' ').replace('Z', '');
    default:
      return d.toISOString();
  }
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// File upload utilities
const validateFileType = (filename, allowedTypes) => {
  const extension = filename.split('.').pop().toLowerCase();
  return allowedTypes.includes(extension);
};

const validateFileSize = (size, maxSizeMB = 5) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
};

// Cache utilities
const cacheKey = (prefix, ...args) => {
  return `${prefix}:${args.join(':')}`;
};

const getCacheTTL = (type) => {
  const ttlMap = {
    'user': 3600, // 1 hour
    'product': 1800, // 30 minutes
    'category': 7200, // 2 hours
    'order': 600, // 10 minutes
    'dashboard': 300, // 5 minutes
  };
  return ttlMap[type] || 600; // Default 10 minutes
};

// Error utilities
const isOperationalError = (error) => {
  return error.isOperational === true;
};

const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

// Environment utilities
const isDevelopment = () => process.env.NODE_ENV === 'development';
const isProduction = () => process.env.NODE_ENV === 'production';
const isTest = () => process.env.NODE_ENV === 'test';

const getEnvVar = (name, defaultValue = null) => {
  return process.env[name] || defaultValue;
};

// API utilities
const getBaseUrl = (req) => {
  return `${req.protocol}://${req.get('host')}`;
};

const getClientIp = (req) => {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
};

module.exports = {
  // Response formatters
  formatResponse,
  successResponse,
  errorResponse,
  paginatedResponse,
  
  // Pagination
  getPaginationParams,
  buildPaginationMeta,
  
  // Query builders
  buildWhereClause,
  buildOrderClause,
  
  // Data transformers
  transformProduct,
  transformOrder,
  transformUser,
  
  // Validation helpers
  validateRequiredFields,
  validateEnum,
  
  // String utilities
  slugify,
  generateRandomString,
  
  // Date utilities
  formatDate,
  addDays,
  
  // File utilities
  validateFileType,
  validateFileSize,
  
  // Cache utilities
  cacheKey,
  getCacheTTL,
  
  // Error utilities
  isOperationalError,
  createError,
  
  // Environment utilities
  isDevelopment,
  isProduction,
  isTest,
  getEnvVar,
  
  // API utilities
  getBaseUrl,
  getClientIp,
};
