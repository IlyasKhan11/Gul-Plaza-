const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  registerUser,
  loginUser,
  getUserProfile,
  registerValidation,
  loginValidation,
} = require('../controllers/authController');
const { authenticateToken, logout } = require('../middleware/authMiddleware');
const { requireAnyRole } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for registration (more lenient)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth routes info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication API endpoints',
    endpoints: {
      'POST /api/auth/register': 'Register new user',
      'POST /api/auth/login': 'Login user',
      'POST /api/auth/logout': 'Logout user',
      'GET /api/auth/profile': 'Get user profile',
      'GET /api/auth/verify': 'Verify JWT token',
    },
    note: 'Use POST /api/auth/login to get started',
  });
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (buyer, seller, or admin)
 * @access  Public
 */
router.post('/register', registerLimiter, registerValidation, registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
router.post('/login', authLimiter, loginValidation, loginUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate token
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, requireAnyRole, getUserProfile);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token is valid
 * @access  Private
 */
router.get('/verify', authenticateToken, requireAnyRole, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    data: {
      user: {
        id: req.user.userId,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
});

module.exports = router;
