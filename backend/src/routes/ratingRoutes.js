const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  submitRating,
  getProductRatings,
  getUserRatingForProduct,
  getRatableOrders,
  submitRatingValidation,
  productIdValidation
} = require('../controllers/ratingController');

const { handleValidationErrors } = require('../middleware/validationMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireBuyer } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting
const ratingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many rating requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Product Rating API endpoints',
    endpoints: {
      'POST /api/ratings': 'Submit a rating for a product (buyer only)',
      'GET /api/ratings/product/:productId': 'Get ratings for a product',
      'GET /api/ratings/my-rating/:productId': 'Get buyer\'s rating for a product (buyer only)',
      'GET /api/ratings/ratable': 'Get delivered orders that can be rated (buyer only)',
    }
  });
});

/**
 * @route   POST /api/ratings
 * @desc    Submit a rating for a product
 * @access  Private (Buyer only)
 */
router.post(
  '/',
  authenticateToken,
  requireBuyer,
  ratingLimiter,
  submitRatingValidation,
  handleValidationErrors,
  submitRating
);

/**
 * @route   GET /api/ratings/product/:productId
 * @desc    Get all ratings for a product
 * @access  Public
 */
router.get(
  '/product/:productId',
  productIdValidation,
  handleValidationErrors,
  getProductRatings
);

/**
 * @route   GET /api/ratings/my-rating/:productId
 * @desc    Get buyer's rating for a specific product
 * @access  Private (Buyer only)
 */
router.get(
  '/my-rating/:productId',
  authenticateToken,
  requireBuyer,
  productIdValidation,
  handleValidationErrors,
  getUserRatingForProduct
);

/**
 * @route   GET /api/ratings/ratable
 * @desc    Get products from delivered orders that can be rated
 * @access  Private (Buyer only)
 */
router.get(
  '/ratable',
  authenticateToken,
  requireBuyer,
  ratingLimiter,
  getRatableOrders
);

module.exports = router;
