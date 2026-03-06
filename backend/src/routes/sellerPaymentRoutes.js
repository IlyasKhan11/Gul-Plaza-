const express = require('express');
const rateLimit = require('express-rate-limit');

// Import seller payment controllers
const {
  verifyEasyPaisaPayment,
  getPendingVerificationOrders,
  sendWhatsAppMessage
} = require('../controllers/sellerPaymentController');

const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const { authenticateToken } = require('../middleware/authMiddleware');
const { requireSeller } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting for payment verification operations
const paymentVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 payment verification requests per windowMs
  message: {
    success: false,
    message: 'Too many payment verification requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for WhatsApp messages
const whatsappLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 WhatsApp messages per windowMs
  message: {
    success: false,
    message: 'Too many WhatsApp messages, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Seller Payment routes info endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Seller Payment API endpoints',
    endpoints: {
      'GET /api/seller/payments/pending-verification': 'Get orders pending EASYPaisa verification (seller only)',
      'POST /api/seller/payments/:orderId/verify-easypaisa': 'Verify EASYPaisa payment (seller only)',
      'POST /api/seller/payments/:orderId/send-whatsapp': 'Send manual WhatsApp message to buyer (seller only)',
    },
    note: 'All seller payment endpoints require seller role',
  });
});

/**
 * @route   GET /api/seller/payments/pending-verification
 * @desc    Get orders pending EASYPaisa payment verification
 * @access  Private (Seller only)
 */
router.get(
  '/pending-verification',
  authenticateToken,
  requireSeller,
  
  getPendingVerificationOrders
);

/**
 * @route   POST /api/seller/payments/:orderId/verify-easypaisa
 * @desc    Verify EASYPaisa payment for order
 * @access  Private (Seller only)
 */
router.post(
  '/:orderId/verify-easypaisa',
  authenticateToken,
  requireSeller,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  handleValidationErrors,
  verifyEasyPaisaPayment
);

/**
 * @route   POST /api/seller/payments/:orderId/send-whatsapp
 * @desc    Send manual WhatsApp message to buyer
 * @access  Private (Seller only)
 */
router.post(
  '/:orderId/send-whatsapp',
  authenticateToken,
  requireSeller,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  body('message').isString().notEmpty().withMessage('Message is required and cannot be empty'),
  handleValidationErrors,
  sendWhatsAppMessage
);

module.exports = router;
