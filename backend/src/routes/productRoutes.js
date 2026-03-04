const express = require('express');
const rateLimit = require('express-rate-limit');

// Import controllers and validation
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getAllProducts,
  getSellerProducts,
  createProductValidation,
  updateProductValidation,
  productIdValidation
} = require('../controllers/productController');

const { handleValidationErrors } = require('../middleware/validationMiddleware');

const { authenticateToken } = require('../middleware/authMiddleware');
const { requireSeller } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting for product operations
const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many product requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More restrictive rate limiting for seller product operations
const sellerProductLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 seller requests per windowMs
  message: {
    success: false,
    message: 'Too many seller product operations, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Product routes info endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Product API endpoints',
    endpoints: {
      'GET /api/products': 'Get all products with filtering (public)',
      'GET /api/products/:id': 'Get product by ID (public)',
      'POST /api/products': 'Create new product (seller only)',
      'PUT /api/products/:id': 'Update product (seller only)',
      'DELETE /api/products/:id': 'Delete product (seller only)',
      'GET /api/products/seller/my-products': 'Get seller\'s products (seller only)',
    },
    note: 'Create, update, delete, and my-products endpoints require seller role',
  });
});

/**
 * @route   GET /api/products
 * @desc    Get all products with filtering and pagination
 * @access  Public
 */
router.get('/', getAllProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID with images
 * @access  Public
 */
router.get('/:id', productIdValidation, handleValidationErrors, getProductById);

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (Seller only)
 */
router.post('/', authenticateToken, requireSeller, sellerProductLimiter, createProductValidation, handleValidationErrors, createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Seller only)
 */
router.put('/:id', authenticateToken, requireSeller, sellerProductLimiter, productIdValidation, handleValidationErrors, updateProductValidation, handleValidationErrors, updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product
 * @access  Private (Seller only)
 */
router.delete('/:id', authenticateToken, requireSeller, sellerProductLimiter, productIdValidation, handleValidationErrors, deleteProduct);

/**
 * @route   GET /api/products/seller/my-products
 * @desc    Get seller's products
 * @access  Private (Seller only)
 */
router.get('/seller/my-products', authenticateToken, requireSeller, sellerProductLimiter, getSellerProducts);

module.exports = router;
