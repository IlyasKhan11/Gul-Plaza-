const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getBuyerOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getSellerOrders,
  createOrderValidation,
  updateOrderStatusValidation,
  orderIdValidation,
} = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireBuyer, requireSeller, requireAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting for order operations
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many order requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More restrictive rate limiting for order creation and status updates
const orderActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 order actions per windowMs
  message: {
    success: false,
    message: 'Too many order actions, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Order routes info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Order API endpoints',
    endpoints: {
      'GET /api/orders/buyer/my-orders': 'Get buyer\'s orders (buyer only)',
      'GET /api/orders/seller/my-orders': 'Get seller\'s orders (seller only)',
      'GET /api/orders/:id': 'Get order by ID (buyer/seller)',
      'POST /api/orders': 'Create new order (buyer only)',
      'PATCH /api/orders/:id/status': 'Update order status (admin only)',
      'PATCH /api/orders/:id/cancel': 'Cancel order (buyer only)',
    },
    note: 'Different endpoints require different roles (buyer, seller, admin)',
  });
});

/**
 * @route   GET /api/orders/buyer/my-orders
 * @desc    Get all orders for a buyer
 * @access  Private (Buyer only)
 */
router.get('/buyer/my-orders', authenticateToken, requireBuyer, orderLimiter, getBuyerOrders);

/**
 * @route   GET /api/orders/seller/my-orders
 * @desc    Get seller's orders (orders containing seller's products)
 * @access  Private (Seller only)
 */
router.get('/seller/my-orders', authenticateToken, requireSeller, orderLimiter, getSellerOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID with items
 * @access  Private (Buyer/Seller)
 */
router.get('/:id', authenticateToken, orderLimiter, orderIdValidation, getOrderById);

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private (Buyer only)
 */
router.post('/', authenticateToken, requireBuyer, orderActionLimiter, createOrderValidation, createOrder);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin only)
 */
router.patch('/:id/status', authenticateToken, requireAdmin, orderActionLimiter, orderIdValidation, updateOrderStatusValidation, updateOrderStatus);

/**
 * @route   PATCH /api/orders/:id/cancel
 * @desc    Cancel order (only for pending orders)
 * @access  Private (Buyer only)
 */
router.patch('/:id/cancel', authenticateToken, requireBuyer, orderActionLimiter, orderIdValidation, cancelOrder);

module.exports = router;
