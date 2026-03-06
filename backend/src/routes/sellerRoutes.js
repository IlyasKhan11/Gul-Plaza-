const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getSellerProfile,
  updateSellerProfile,
  createStore,
  updateStore,
  applyForSeller,
  getSellerDashboard,
  getPublicStores,
  getPublicStoreById,
  getStoreContactInfo,
  updateSellerProfileValidation,
  createStoreValidation,
  updateStoreValidation,
  applyForSellerValidation,
} = require('../controllers/sellerController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireSeller } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting for seller profile operations
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: {
    success: false,
    message: 'Too many profile requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for store operations (more restrictive)
const storeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 store requests per windowMs
  message: {
    success: false,
    message: 'Too many store operations, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Seller routes info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Seller API endpoints',
    endpoints: {
      'GET /api/sellers/profile': 'Get seller profile',
      'PUT /api/sellers/profile': 'Update seller profile',
      'POST /api/sellers/apply': 'Apply to become a seller (non-seller users only)',
      'POST /api/sellers/store': 'Create store',
      'PUT /api/sellers/store': 'Update store details',
      'GET /api/sellers/dashboard': 'Get seller dashboard statistics',
    },
    note: 'All endpoints require authentication. Some require seller role.',
  });
});

/**
 * @route   GET /api/sellers/stores
 * @desc    Get public list of active stores
 * @access  Public
 */
router.get('/stores', getPublicStores);

/**
 * @route   GET /api/sellers/stores/:storeId
 * @desc    Get a single store by ID
 * @access  Public
 */
router.get('/stores/:storeId', getPublicStoreById);

/**
 * @route   GET /api/sellers/:sellerId/contact
 * @desc    Get store contact info (public - used by checkout)
 * @access  Public
 */
router.get('/:sellerId/contact', getStoreContactInfo);

/**
 * @route   GET /api/sellers/dashboard
 * @desc    Get seller dashboard statistics
 * @access  Private (Seller only)
 */
router.get('/dashboard', authenticateToken, requireSeller, profileLimiter, getSellerDashboard);

/**
 * @route   POST /api/sellers/apply
 * @desc    Apply to become a seller (create store application)
 * @access  Private (Non-seller users only)
 */
router.post('/apply', authenticateToken, storeLimiter, applyForSellerValidation, applyForSeller);

/**
 * @route   GET /api/sellers/profile
 * @desc    Get seller profile
 * @access  Private (Seller only)
 */
router.get('/profile', authenticateToken, requireSeller, profileLimiter, getSellerProfile);

/**
 * @route   PUT /api/sellers/profile
 * @desc    Update seller profile
 * @access  Private (Seller only)
 */
router.put('/profile', authenticateToken, requireSeller, profileLimiter, updateSellerProfileValidation, updateSellerProfile);

/**
 * @route   POST /api/sellers/store
 * @desc    Create store
 * @access  Private (Seller only)
 */
router.post('/store', authenticateToken, requireSeller, storeLimiter, createStoreValidation, createStore);

/**
 * @route   PUT /api/sellers/store
 * @desc    Update store details
 * @access  Private (Seller only)
 */
router.put('/store', authenticateToken, requireSeller, storeLimiter, updateStoreValidation, updateStore);

module.exports = router;
