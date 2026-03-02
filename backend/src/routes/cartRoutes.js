const express = require('express');
const rateLimit = require('express-rate-limit');

// Import cart controllers and validation
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary
} = require('../controllers/cartController');

const {
  validateAddToCart,
  validateUpdateCartItem,
  validateProductId,
  validateCartQuery
} = require('../validations/cartValidation');

const { authenticateToken } = require('../middleware/authMiddleware');
const { requireBuyer } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting for cart operations
const cartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 cart requests per windowMs
  message: {
    success: false,
    message: 'Too many cart requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More restrictive rate limiting for cart modifications
const cartModifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 cart modifications per windowMs
  message: {
    success: false,
    message: 'Too many cart modifications, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Cart routes info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Cart API endpoints',
    endpoints: {
      'POST /api/cart': 'Add product to cart (buyer only)',
      'GET /api/cart': 'Get user cart (buyer only)',
      'PUT /api/cart/:productId': 'Update cart item quantity (buyer only)',
      'DELETE /api/cart/:productId': 'Remove item from cart (buyer only)',
      'DELETE /api/cart': 'Clear entire cart (buyer only)',
      'GET /api/cart/summary': 'Get cart summary for checkout (buyer only)',
    },
    note: 'All cart endpoints require buyer role',
  });
});

/**
 * @route   POST /api/cart
 * @desc    Add product to cart
 * @access  Private (Buyer only)
 */
router.post(
  '/',
  authenticateToken,
  requireBuyer,
  cartModifyLimiter,
  validateAddToCart,
  addToCart
);

/**
 * @route   GET /api/cart
 * @desc    Get user's cart with product details
 * @access  Private (Buyer only)
 */
router.get(
  '/',
  authenticateToken,
  requireBuyer,
  cartLimiter,
  getCart
);

/**
 * @route   PUT /api/cart/:productId
 * @desc    Update cart item quantity
 * @access  Private (Buyer only)
 */
router.put(
  '/:productId',
  authenticateToken,
  requireBuyer,
  cartModifyLimiter,
  validateProductId,
  validateUpdateCartItem,
  updateCartItem
);

/**
 * @route   DELETE /api/cart/:productId
 * @desc    Remove item from cart
 * @access  Private (Buyer only)
 */
router.delete(
  '/:productId',
  authenticateToken,
  requireBuyer,
  cartModifyLimiter,
  validateProductId,
  removeFromCart
);

/**
 * @route   DELETE /api/cart
 * @desc    Clear entire cart
 * @access  Private (Buyer only)
 */
router.delete(
  '/',
  authenticateToken,
  requireBuyer,
  cartModifyLimiter,
  clearCart
);

/**
 * @route   GET /api/cart/summary
 * @desc    Get cart summary for checkout
 * @access  Private (Buyer only)
 */
router.get(
  '/summary',
  authenticateToken,
  requireBuyer,
  cartLimiter,
  getCartSummary
);

module.exports = router;
