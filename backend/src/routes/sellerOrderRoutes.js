const express = require('express');
const rateLimit = require('express-rate-limit');

// Import seller order controllers
const {
  getSellerOrders,
  getSellerOrderById,
  confirmOrder,
  shipOrderWithTracking,
  deliverOrder,
  getSellerNotifications,
  markNotificationAsRead,
  getMonthlyRevenue,
  getSellerEarnings,
  verifyEasypaisaPayment,
  updateOrderStatusBySeller,
} = require('../controllers/sellerOrderController');

// Import seller payment controller for WhatsApp
const {
  sendWhatsAppMessage
} = require('../controllers/sellerPaymentController');

const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const { authenticateToken } = require('../middleware/authMiddleware');
const { requireSeller } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting for seller order operations
const sellerOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many seller order requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More restrictive rate limiting for order actions
const sellerOrderActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 order actions per windowMs
  message: {
    success: false,
    message: 'Too many seller order actions, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Seller Order routes info endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Seller Order API endpoints',
    endpoints: {
      'GET /api/seller/orders': 'Get seller orders (seller only)',
      'GET /api/seller/orders/:orderId': 'Get order by ID (seller only)',
      'POST /api/seller/orders/:orderId/confirm': 'Confirm order (seller only)',
      'POST /api/seller/orders/:orderId/ship': 'Ship order with tracking (seller only)',
      'GET /api/seller/notifications': 'Get seller notifications (seller only)',
      'PATCH /api/seller/notifications/:notificationId/read': 'Mark notification as read (seller only)',
    },
    note: 'All seller order endpoints require seller role',
  });
});

/**
 * @route   GET /api/seller/orders
 * @desc    Get seller's orders with pagination and filtering
 * @access  Private (Seller only)
 */
router.get(
  '/orders',
  authenticateToken,
  requireSeller,
  
  getSellerOrders
);

/**
 * @route   GET /api/seller/orders/:orderId
 * @desc    Get specific order by ID (seller's orders only)
 * @access  Private (Seller only)
 */
router.get(
  '/orders/:orderId',
  authenticateToken,
  requireSeller,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  handleValidationErrors,
  getSellerOrderById
);

/**
 * @route   POST /api/seller/orders/:orderId/confirm
 * @desc    Confirm order (seller only)
 * @access  Private (Seller only)
 */
router.post(
  '/orders/:orderId/confirm',
  authenticateToken,
  requireSeller,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  handleValidationErrors,
  confirmOrder
);

/**
 * @route   POST /api/seller/orders/:orderId/ship
 * @desc    Ship order with tracking information (seller only)
 * @access  Private (Seller only)
 */
router.post(
  '/orders/:orderId/ship',
  authenticateToken,
  requireSeller,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  body('courier_name').isString().notEmpty().withMessage('Courier name is required'),
  body('tracking_number').isString().notEmpty().withMessage('Tracking number is required'),
  handleValidationErrors,
  shipOrderWithTracking
);

/**
 * @route   POST /api/seller/orders/:orderId/deliver
 * @desc    Mark order as delivered (seller only)
 * @access  Private (Seller only)
 */
router.post(
  '/orders/:orderId/deliver',
  authenticateToken,
  requireSeller,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  handleValidationErrors,
  deliverOrder
);

/**
 * @route   GET /api/seller/notifications
 * @desc    Get seller notifications with pagination and filtering
 * @access  Private (Seller only)
 */
router.get(
  '/notifications',
  authenticateToken,
  requireSeller,
  
  getSellerNotifications
);

/**
 * @route   PATCH /api/seller/notifications/:notificationId/read
 * @desc    Mark notification as read (seller only)
 * @access  Private (Seller only)
 */
router.patch(
  '/notifications/:notificationId/read',
  authenticateToken,
  requireSeller,
  
  param('notificationId').isInt({ min: 1 }).withMessage('Notification ID must be a positive integer'),
  handleValidationErrors,
  markNotificationAsRead
);

/**
 * @route   POST /api/seller/orders/:orderId/whatsapp
 * @desc    Send WhatsApp message to buyer (seller only)
 * @access  Private (Seller only)
 */
router.post(
  '/orders/:orderId/whatsapp',
  authenticateToken,
  requireSeller,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  body('message').isString().notEmpty().withMessage('Message is required'),
  handleValidationErrors,
  sendWhatsAppMessage
);

/**
 * @route   POST /api/seller/orders/:orderId/verify-payment
 * @desc    Verify EasyPaisa payment - transition awaiting_verification → paid (seller only)
 * @access  Private (Seller only)
 */
router.post(
  '/orders/:orderId/verify-payment',
  authenticateToken,
  requireSeller,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  handleValidationErrors,
  verifyEasypaisaPayment
);

/**
 * @route   PATCH /api/seller/orders/:orderId/status
 * @desc    Update order status (seller only - cancellation only)
 * @access  Private (Seller only)
 */
router.patch(
  '/orders/:orderId/status',
  authenticateToken,
  requireSeller,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  body('status').isString().notEmpty().withMessage('Status is required'),
  handleValidationErrors,
  updateOrderStatusBySeller
);

/**
 * @route   GET /api/seller/orders/revenue/monthly
 * @desc    Get monthly revenue for seller
 * @access  Private (Seller only)
 */
router.get(
  '/orders/revenue/monthly',
  authenticateToken,
  requireSeller,
  
  getMonthlyRevenue
);

/**
 * @route   GET /api/seller/earnings
 * @desc    Get seller earnings/transactions
 * @access  Private (Seller only)
 */
router.get(
  '/earnings',
  authenticateToken,
  requireSeller,
  
  getSellerEarnings
);

module.exports = router;
