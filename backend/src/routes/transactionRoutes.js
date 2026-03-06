const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');

// Import transaction controllers
const {
  uploadTransactionSlip,
  getTransactionSlips,
  approveTransactionSlip,
  getPendingTransactionSlips
} = require('../controllers/transactionController');

const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const { authenticateToken } = require('../middleware/authMiddleware');
const { requireBuyer, requireSeller } = require('../middleware/roleMiddleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/transaction_slips/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Rate limiting for transaction operations
const transactionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 transaction requests per windowMs
  message: {
    success: false,
    message: 'Too many transaction requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Transaction routes info endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Transaction API endpoints',
    endpoints: {
      'POST /api/transactions/:orderId/upload-slip': 'Upload transaction slip (buyer only)',
      'GET /api/transactions/:orderId/slips': 'Get transaction slips for order (buyer/seller only)',
      'POST /api/transactions/slips/:slipId/approve': 'Approve/reject transaction slip (seller only)',
      'GET /api/transactions/pending-slips': 'Get pending transaction slips (seller only)',
    },
    note: 'File upload endpoint accepts image files (max 5MB)',
  });
});

/**
 * @route   POST /api/transactions/:orderId/upload-slip
 * @desc    Upload transaction slip image for order
 * @access  Private (Buyer only)
 */
router.post(
  '/:orderId/upload-slip',
  authenticateToken,
  requireBuyer,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  upload.single('slip_image'), // Expect single file with field name 'slip_image'
  body('transaction_id').optional().isString().withMessage('Transaction ID must be a string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  handleValidationErrors,
  uploadTransactionSlip
);

/**
 * @route   GET /api/transactions/:orderId/slips
 * @desc    Get transaction slips for an order
 * @access  Private (Buyer/Seller only)
 */
router.get(
  '/:orderId/slips',
  authenticateToken,
  
  param('orderId').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  handleValidationErrors,
  getTransactionSlips
);

/**
 * @route   POST /api/transactions/slips/:slipId/approve
 * @desc    Approve or reject transaction slip
 * @access  Private (Seller only)
 */
router.post(
  '/slips/:slipId/approve',
  authenticateToken,
  requireSeller,
  
  param('slipId').isInt({ min: 1 }).withMessage('Slip ID must be a positive integer'),
  body('action').isIn(['approve', 'reject']).withMessage('Action must be either approve or reject'),
  body('rejection_reason').optional().isString().withMessage('Rejection reason must be a string'),
  handleValidationErrors,
  approveTransactionSlip
);

/**
 * @route   GET /api/transactions/pending-slips
 * @desc    Get pending transaction slips for seller
 * @access  Private (Seller only)
 */
router.get(
  '/pending-slips',
  authenticateToken,
  requireSeller,
  
  getPendingTransactionSlips
);

module.exports = router;
