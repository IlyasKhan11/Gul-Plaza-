const Joi = require('joi');

// Add to cart validation schema
const addToCartSchema = Joi.object({
  product_id: Joi.number()
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
    .max(999)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be an integer',
      'number.positive': 'Quantity must be greater than 0',
      'number.max': 'Quantity cannot exceed 999',
      'any.required': 'Quantity is required'
    })
});

// Update cart item validation schema
const updateCartItemSchema = Joi.object({
  quantity: Joi.number()
    .integer()
    .positive()
    .max(999)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be an integer',
      'number.positive': 'Quantity must be greater than 0',
      'number.max': 'Quantity cannot exceed 999',
      'any.required': 'Quantity is required'
    })
});

// Product ID validation schema for cart operations
const productIdSchema = Joi.object({
  productId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Product ID must be a number',
      'number.integer': 'Product ID must be an integer',
      'number.positive': 'Product ID must be a positive integer',
      'any.required': 'Product ID is required'
    })
});

// Cart query validation schema
const cartQuerySchema = Joi.object({
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
    })
});

// Validation middleware functions
const validateAddToCart = (req, res, next) => {
  const { error } = addToCartSchema.validate(req.body);
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

const validateUpdateCartItem = (req, res, next) => {
  const { error } = updateCartItemSchema.validate(req.body);
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

const validateProductId = (req, res, next) => {
  const { error } = productIdSchema.validate(req.params);
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

const validateCartQuery = (req, res, next) => {
  const { error, value } = cartQuerySchema.validate(req.query);
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
  addToCartSchema,
  updateCartItemSchema,
  productIdSchema,
  cartQuerySchema,
  validateAddToCart,
  validateUpdateCartItem,
  validateProductId,
  validateCartQuery
};
