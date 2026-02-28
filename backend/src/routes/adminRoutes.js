const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getAllUsers,
  blockUser,
  unblockUser,
  getUserById,
  blockUserValidation,
} = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting for admin operations
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More restrictive rate limiting for user blocking operations
const blockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 block/unblock requests per windowMs
  message: {
    success: false,
    message: 'Too many block/unblock operations, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin routes info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin API endpoints',
    endpoints: {
      'GET /api/admin/users': 'Get all users with pagination and filtering',
      'GET /api/admin/users/:id': 'Get user details by ID',
      'PATCH /api/admin/users/:id/block': 'Block user',
      'PATCH /api/admin/users/:id/unblock': 'Unblock user',
    },
    note: 'All endpoints require authentication and admin role',
  });
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (Admin only)
 */
router.get('/users', authenticateToken, requireAdmin, adminLimiter, getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user details by ID
 * @access  Private (Admin only)
 */
router.get('/users/:id', authenticateToken, requireAdmin, adminLimiter, getUserById);

/**
 * @route   PATCH /api/admin/users/:id/block
 * @desc    Block user
 * @access  Private (Admin only)
 */
router.patch('/users/:id/block', authenticateToken, requireAdmin, blockLimiter, blockUserValidation, blockUser);

/**
 * @route   PATCH /api/admin/users/:id/unblock
 * @desc    Unblock user
 * @access  Private (Admin only)
 */
router.patch('/users/:id/unblock', authenticateToken, requireAdmin, blockLimiter, blockUserValidation, unblockUser);

module.exports = router;
