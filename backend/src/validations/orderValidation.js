const Joi = require('joi');

// Create order validation schema (no body needed for cart checkout)
const createOrderSchema = Joi.object({}).unknown(false).messages({
  'object.unknown': 'No additional fields allowed in order creation'
});

// Order ID validation schema
const orderIdSchema = Joi.object({
  orderId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Order ID must be a number',
      'number.integer': 'Order ID must be an integer',
      'number.positive': 'Order ID must be a positive integer',
      'any.required': 'Order ID is required'
    })
});

// Update order status validation schema (admin only)
const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled',
      'any.required': 'Status is required'
    }),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .trim()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

// Order query validation schema
const orderQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .positive()
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.positive': 'Page must be a positive integer'
    }),
  
  limit: Joi.number()
    .integer()
    .positive()
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.positive': 'Limit must be a positive integer',
      'number.max': 'Limit cannot exceed 100'
    }),
  
  status: Joi.string()
    .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled'
    }),
  
  start_date: Joi.date()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),
  
  end_date: Joi.date()
    .optional()
    .messages({
      'date.base': 'End date must be a valid date'
    }),
  
  sort_by: Joi.string()
    .valid('created_at', 'total', 'status')
    .default('created_at')
    .messages({
      'any.only': 'Sort by must be one of: created_at, total, status'
    }),
  
  sort_order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    })
});

// Payment method selection validation schema
const selectPaymentMethodSchema = Joi.object({
  payment_method: Joi.string()
    .valid('COD', 'BANK_TRANSFER')
    .required()
    .messages({
      'any.only': 'Payment method must be either COD or BANK_TRANSFER',
      'any.required': 'Payment method is required'
    })
});

// Admin order query validation schema (includes user filtering)
const adminOrderQuerySchema = orderQuerySchema.keys({
  user_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'User ID must be a number',
      'number.integer': 'User ID must be an integer',
      'number.positive': 'User ID must be a positive integer'
    }),
  
  email: Joi.string()
    .email()
    .max(255)
    .optional()
    .messages({
      'string.email': 'Email must be a valid email address',
      'string.max': 'Email cannot exceed 255 characters'
    })
});

// Validation middleware functions
const validateCreateOrder = (req, res, next) => {
  const { error } = createOrderSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

const validateOrderId = (req, res, next) => {
  const { error } = orderIdSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

const validateUpdateOrderStatus = (req, res, next) => {
  const { error } = updateOrderStatusSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

const validateOrderQuery = (req, res, next) => {
  const { error, value } = orderQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  req.query = value; // Use validated and sanitized values
  next();
};

const validateSelectPaymentMethod = (req, res, next) => {
  const { error } = selectPaymentMethodSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

const validateAdminOrderQuery = (req, res, next) => {
  const { error, value } = adminOrderQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  req.query = value; // Use validated and sanitized values
  next();
};

module.exports = {
  createOrderSchema,
  orderIdSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  adminOrderQuerySchema,
  selectPaymentMethodSchema,
  validateCreateOrder,
  validateOrderId,
  validateUpdateOrderStatus,
  validateOrderQuery,
  validateAdminOrderQuery,
  validateSelectPaymentMethod
};
