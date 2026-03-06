const express = require('express');
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  createCategoryValidation,
  updateCategoryValidation,
  categoryIdValidation,
} = require('../controllers/categoryController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin, requireAnyRole } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting disabled for development
// const categoryLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many category requests, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const adminCategoryLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 20, // Limit each IP to 20 admin requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many admin category operations, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Category routes info endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Category API endpoints',
    endpoints: {
      'GET /api/categories': 'Get all categories (public)',
      'GET /api/categories/:id': 'Get category by ID (public)',
      'POST /api/categories': 'Create new category (admin only)',
      'PUT /api/categories/:id': 'Update category (admin only)',
      'DELETE /api/categories/:id': 'Delete category (admin only)',
    },
    note: 'Create, update, and delete endpoints require admin role',
  });
});

/**
 * @route   GET /api/categories
 * @desc    Get all categories (with optional parent filtering)
 * @access  Public
 */
router.get('/', getAllCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID with subcategories
 * @access  Public
 */
router.get('/:id', categoryIdValidation, getCategoryById);

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Admin only)
 */
router.post('/', authenticateToken, requireAdmin, createCategoryValidation, createCategory);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, categoryIdValidation, updateCategoryValidation, updateCategory);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, categoryIdValidation, deleteCategory);

module.exports = router;
