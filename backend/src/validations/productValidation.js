const Joi = require('joi');

// Product creation validation schema
const createProductSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(255)
    .required()
    .trim()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title cannot exceed 255 characters',
      'any.required': 'Title is required'
    }),
  
  description: Joi.string()
    .min(1)
    .max(5000)
    .required()
    .trim()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 1 character long',
      'string.max': 'Description cannot exceed 5000 characters',
      'any.required': 'Description is required'
    }),
  
  price: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be greater than 0',
      'any.required': 'Price is required'
    }),
  
  category_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Category ID must be a number',
      'number.integer': 'Category ID must be an integer',
      'number.positive': 'Category ID must be a positive integer',
      'any.required': 'Category ID is required'
    }),
  
  stock: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Stock must be a number',
      'number.integer': 'Stock must be an integer',
      'number.min': 'Stock cannot be negative',
      'any.required': 'Stock is required'
    }),
  
  images: Joi.array()
    .items(Joi.string().uri())
    .optional()
    .max(5)
    .messages({
      'array.base': 'Images must be an array',
      'array.max': 'Maximum 5 images allowed',
      'string.uri': 'Each image must be a valid URL'
    })
});

// Product update validation schema
const updateProductSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(255)
    .optional()
    .trim()
    .messages({
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title cannot exceed 255 characters'
    }),
  
  description: Joi.string()
    .min(1)
    .max(5000)
    .optional()
    .trim()
    .messages({
      'string.empty': 'Description cannot be empty',
      'string.min': 'Description must be at least 1 character long',
      'string.max': 'Description cannot exceed 5000 characters'
    }),
  
  price: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be greater than 0'
    }),
  
  category_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Category ID must be a number',
      'number.integer': 'Category ID must be an integer',
      'number.positive': 'Category ID must be a positive integer'
    }),
  
  stock: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Stock must be a number',
      'number.integer': 'Stock must be an integer',
      'number.min': 'Stock cannot be negative'
    }),
  
  images: Joi.array()
    .items(Joi.string().uri())
    .optional()
    .max(5)
    .messages({
      'array.base': 'Images must be an array',
      'array.max': 'Maximum 5 images allowed',
      'string.uri': 'Each image must be a valid URL'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Product ID validation schema
const productIdSchema = Joi.object({
  id: Joi.number()
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

// Product query validation schema
const productQuerySchema = Joi.object({
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
  
  category_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Category ID must be a number',
      'number.integer': 'Category ID must be an integer',
      'number.positive': 'Category ID must be a positive integer'
    }),
  
  search: Joi.string()
    .max(100)
    .optional()
    .trim()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),
  
  sort_by: Joi.string()
    .valid('price', 'created_at', 'title', 'stock')
    .default('created_at')
    .messages({
      'any.only': 'Sort by must be one of: price, created_at, title, stock'
    }),
  
  sort_order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    })
});

// Validation middleware functions
const validateCreateProduct = (req, res, next) => {
  const { error } = createProductSchema.validate(req.body);
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

const validateUpdateProduct = (req, res, next) => {
  const { error } = updateProductSchema.validate(req.body);
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

const validateProductQuery = (req, res, next) => {
  const { error, value } = productQuerySchema.validate(req.query);
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
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  productQuerySchema,
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
  validateProductQuery
};
