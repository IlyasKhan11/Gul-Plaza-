const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getAllUsers,
  blockUser,
  unblockUser,
  getUserById,
  getSellerApplications,
  approveSellerApplication,
  rejectSellerApplication,
  blockUserValidation,
} = require('../controllers/adminController');
const {
  getDashboardSummary,
  getSalesReport,
  getTopProducts,
  getLowStockProducts,
  dashboardSummaryValidation,
  salesReportValidation,
} = require('../controllers/adminDashboardController');
const {
  getAllReports,
  getReportStatistics,
  getProductReports,
  updateReportStatus,
} = require('../controllers/reportController');
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
      'GET /api/admin/dashboard': 'Get admin dashboard statistics',
      'GET /api/admin/dashboard/summary': 'Get dashboard summary statistics',
      'GET /api/admin/dashboard/sales-report': 'Get sales report with date range',
      'GET /api/admin/dashboard/top-products': 'Get top 5 products by sales',
      'GET /api/admin/products/low-stock': 'Get low stock products alert',
      'GET /api/admin/reports': 'Get all product reports',
      'GET /api/admin/reports/statistics': 'Get report statistics',
      'GET /api/admin/reports/product/:productId': 'Get reports for specific product',
      'PUT /api/admin/reports/:id/status': 'Update report status',
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

// Dashboard Analytics Routes

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard (alias for summary)
 * @access  Private (Admin only)
 */
router.get('/dashboard', authenticateToken, requireAdmin, adminLimiter, dashboardSummaryValidation, getDashboardSummary);

/**
 * @route   GET /api/admin/dashboard/summary
 * @desc    Get dashboard summary statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard/summary', authenticateToken, requireAdmin, adminLimiter, dashboardSummaryValidation, getDashboardSummary);

/**
 * @route   GET /api/admin/dashboard/sales-report
 * @desc    Get sales report with date range
 * @access  Private (Admin only)
 */
router.get('/dashboard/sales-report', authenticateToken, requireAdmin, adminLimiter, salesReportValidation, getSalesReport);

/**
 * @route   GET /api/admin/dashboard/top-products
 * @desc    Get top 5 products by sales
 * @access  Private (Admin only)
 */
router.get('/dashboard/top-products', authenticateToken, requireAdmin, adminLimiter, getTopProducts);

/**
 * @route   GET /api/admin/products/low-stock
 * @desc    Get low stock products alert
 * @access  Private (Admin only)
 */
router.get('/products/low-stock', authenticateToken, requireAdmin, adminLimiter, getLowStockProducts);

// Report Management Routes

/**
 * @route   GET /api/admin/reports
 * @desc    Get all product reports
 * @access  Private (Admin only)
 */
router.get('/reports', authenticateToken, requireAdmin, adminLimiter, getAllReports);

/**
 * @route   GET /api/admin/reports/statistics
 * @desc    Get report statistics
 * @access  Private (Admin only)
 */
router.get('/reports/statistics', authenticateToken, requireAdmin, adminLimiter, getReportStatistics);

/**
 * @route   GET /api/admin/reports/product/:productId
 * @desc    Get reports for specific product
 * @access  Private (Admin only)
 */
router.get('/reports/product/:productId', authenticateToken, requireAdmin, adminLimiter, getProductReports);

/**
 * @route   PUT /api/admin/reports/:id/status
 * @desc    Update report status
 * @access  Private (Admin only)
 */
router.put('/reports/:id/status', authenticateToken, requireAdmin, adminLimiter, updateReportStatus);

/**
 * @route   GET /api/admin/seller-applications
 * @desc    Get pending seller applications
 * @access  Private (Admin only)
 */
router.get('/seller-applications', authenticateToken, requireAdmin, adminLimiter, getSellerApplications);

/**
 * @route   POST /api/admin/seller-applications/:storeId/approve
 * @desc    Approve seller application
 * @access  Private (Admin only)
 */
router.post('/seller-applications/:storeId/approve', authenticateToken, requireAdmin, adminLimiter, approveSellerApplication);

/**
 * @route   POST /api/admin/seller-applications/:storeId/reject
 * @desc    Reject seller application
 * @access  Private (Admin only)
 */
router.post('/seller-applications/:storeId/reject', authenticateToken, requireAdmin, adminLimiter, rejectSellerApplication);

module.exports = router;
