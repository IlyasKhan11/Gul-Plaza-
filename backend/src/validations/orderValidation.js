const Joi = require('joi');

// Create order validation schema (with shipping information and items)
const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.number()
          .integer()
          .positive()
          .required()
          .messages({
            'number.base': 'Product ID must be a number',
            'number.integer': 'Product ID must be an integer',
            'number.positive': 'Product ID must be a positive integer',
            'any.required': 'Product ID is required'
          }),
        quantity: Joi.number()
          .integer()
          .positive()
          .min(1)
          .required()
          .messages({
            'number.base': 'Quantity must be a number',
            'number.integer': 'Quantity must be an integer',
            'number.positive': 'Quantity must be a positive integer',
            'number.min': 'Quantity must be at least 1',
            'any.required': 'Quantity is required'
          })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items are required'
    }),

  paymentMethod: Joi.string()
    .valid('COD', 'EASYPaisa', 'BANK_TRANSFER', 'DIRECT_SELLER')
    .required()
    .messages({
      'any.only': 'Payment method must be one of: COD, EASYPaisa, BANK_TRANSFER, DIRECT_SELLER',
      'any.required': 'Payment method is required'
    }),

  shipping_address: Joi.string()
    .required()
    .trim()
    .max(500)
    .messages({
      'string.empty': 'Shipping address is required',
      'any.required': 'Shipping address is required',
      'string.max': 'Shipping address cannot exceed 500 characters'
    }),
  
  shipping_city: Joi.string()
    .required()
    .trim()
    .max(100)
    .messages({
      'string.empty': 'Shipping city is required',
      'any.required': 'Shipping city is required',
      'string.max': 'Shipping city cannot exceed 100 characters'
    }),
  
  shipping_country: Joi.string()
    .required()
    .trim()
    .max(100)
    .messages({
      'string.empty': 'Shipping country is required',
      'any.required': 'Shipping country is required',
      'string.max': 'Shipping country cannot exceed 100 characters'
    }),
  
  shipping_postal_code: Joi.string()
    .required()
    .trim()
    .max(20)
    .messages({
      'string.empty': 'Shipping postal code is required',
      'any.required': 'Shipping postal code is required',
      'string.max': 'Shipping postal code cannot exceed 20 characters'
    }),
  
  shipping_phone: Joi.string()
    .required()
    .trim()
    .max(20)
    .messages({
      'string.empty': 'Shipping phone is required',
      'any.required': 'Shipping phone is required',
      'string.max': 'Shipping phone cannot exceed 20 characters'
    }),
  
  shipping_full_name: Joi.string()
    .trim()
    .max(255)
    .messages({
      'string.max': 'Full name cannot exceed 255 characters'
    })
});

// Order ID validation schema
const orderIdSchema = Joi.object({
  id: Joi.number()
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
    .valid('COD', 'EASYPaisa', 'DIRECT_SELLER')
    .required()
    .messages({
      'any.only': 'Payment method must be either COD, EASYPaisa, or DIRECT_SELLER',
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
