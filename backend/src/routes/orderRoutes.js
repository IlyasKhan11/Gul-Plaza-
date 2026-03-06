const express = require('express');

// Import new order controllers and validation
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  getOrderStatistics,
  selectPaymentMethod,
  verifyPayment,
  shipOrder
} = require('../controllers/newOrderController');

const {
  validateCreateOrder,
  validateOrderId,
  validateUpdateOrderStatus,
  validateOrderQuery,
  validateAdminOrderQuery,
  validateSelectPaymentMethod
} = require('../validations/orderValidation');

const { authenticateToken } = require('../middleware/authMiddleware');
const { requireBuyer, requireAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting disabled for development
// const orderLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 50, // Limit each IP to 50 requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many order requests, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const orderActionLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // Limit each IP to 10 order actions per windowMs
//   message: {
//     success: false,
//     message: 'Too many order actions, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// BUYER ROUTES

/**
 * @route   POST /api/orders
 * @desc    Create order from cart (CRITICAL - uses transaction with row locking)
 * @access  Private (Buyer only)
 */
router.post(
  '/',
  authenticateToken,
  requireBuyer,
  validateCreateOrder,
  createOrder
);

/**
 * @route   GET /api/orders
 * @desc    Get user's orders with pagination and filtering
 * @access  Private (Buyer only)
 */
router.get(
  '/',
  authenticateToken,
  requireBuyer,
  validateOrderQuery,
  getMyOrders
);

/**
 * @route   GET /api/orders/:orderId
 * @desc    Get specific order by ID (user's own orders only)
 * @access  Private (Buyer only)
 */
router.get(
  '/:orderId',
  authenticateToken,
  requireBuyer,
  validateOrderId,
  getOrderById
);

/**
 * @route   POST /api/orders/:id/select-payment
 * @desc    Select payment method for order (buyer only)
 * @access  Private (Buyer only)
 */
router.post(
  '/:id/select-payment',
  authenticateToken,
  requireBuyer,
  validateOrderId,
  validateSelectPaymentMethod,
  selectPaymentMethod
);

// ADMIN ROUTES

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with pagination and filtering (admin only)
 * @access  Private (Admin only)
 */
router.get(
  '/admin/orders',
  authenticateToken,
  requireAdmin,
  
  validateAdminOrderQuery,
  getAllOrders
);

/**
 * @route   GET /api/admin/orders/:orderId
 * @desc    Get any order by ID (admin only)
 * @access  Private (Admin only)
 */
router.get(
  '/admin/orders/:orderId',
  authenticateToken,
  requireAdmin,
  
  validateOrderId,
  getAdminOrderById
);

/**
 * @route   PUT /api/admin/orders/:orderId/status
 * @desc    Update order status (admin only)
 * @access  Private (Admin only)
 */
router.put(
  '/admin/orders/:orderId/status',
  authenticateToken,
  requireAdmin,
  
  validateOrderId,
  validateUpdateOrderStatus,
  updateOrderStatus
);

/**
 * @route   GET /api/admin/orders/statistics
 * @desc    Get order statistics (admin only)
 * @access  Private (Admin only)
 */
router.get(
  '/admin/orders/statistics',
  authenticateToken,
  requireAdmin,
  
  getOrderStatistics
);

/**
 * @route   PATCH /api/admin/orders/:id/verify
 * @desc    Verify payment for bank transfer orders (admin only)
 * @access  Private (Admin only)
 */
router.patch(
  '/admin/orders/:id/verify',
  authenticateToken,
  requireAdmin,
  
  validateOrderId,
  verifyPayment
);

/**
 * @route   PATCH /api/admin/orders/:id/ship
 * @desc    Ship paid or confirmed orders (admin only)
 * @access  Private (Admin only)
 */
router.patch(
  '/admin/orders/:id/ship',
  authenticateToken,
  requireAdmin,
  
  validateOrderId,
  shipOrder
);

module.exports = router;
