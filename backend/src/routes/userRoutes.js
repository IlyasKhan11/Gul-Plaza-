const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getBuyerProfile,
  updateBuyerProfile,
  updateProfileValidation,
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireBuyer } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting for user profile operations
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

// User routes info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User API endpoints',
    endpoints: {
      'GET /api/users/profile': 'Get logged-in buyer profile',
      'PUT /api/users/profile': 'Update buyer profile',
    },
    note: 'All endpoints require authentication and buyer role',
  });
});

/**
 * @route   GET /api/users/profile
 * @desc    Get logged-in buyer profile
 * @access  Private (Buyer only)
 */
router.get('/profile', authenticateToken, requireBuyer, profileLimiter, getBuyerProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update buyer profile
 * @access  Private (Buyer only)
 */
router.put('/profile', authenticateToken, requireBuyer, profileLimiter, updateProfileValidation, updateBuyerProfile);

module.exports = router;
