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
  exportReportsCSV,
  exportReportsPDF,
} = require('../controllers/reportController');
const {
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  getOrderStatistics,
} = require('../controllers/newOrderController');
const {
  validateAdminOrderQuery,
  validateOrderId,
  validateUpdateOrderStatus,
} = require('../validations/orderValidation');
const {
  getPlatformSettings,
  updateCommissionRate,
  getTransactions,
  getCommissionsBySeller,
  getWithdrawalRequests,
  createWithdrawalRequest,
  approveWithdrawal,
  rejectWithdrawal,
  exportTransactionsCSV,
  exportTransactionsPDF,
  exportWithdrawalsCSV,
  exportWithdrawalsPDF
} = require('../controllers/adminFinancialController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin, requireSeller } = require('../middleware/roleMiddleware');

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
      'GET /api/admin/orders': 'Get all orders with pagination and filtering',
      'GET /api/admin/orders/:id': 'Get order details by ID',
      'PUT /api/admin/orders/:id/status': 'Update order status',
      'GET /api/admin/orders/statistics': 'Get order statistics',
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

// Order Management Routes

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with pagination and filtering
 * @access  Private (Admin only)
 */
router.get('/orders', authenticateToken, requireAdmin, adminLimiter, validateAdminOrderQuery, getAllOrders);

/**
 * @route   GET /api/admin/orders/:id
 * @desc    Get order details by ID
 * @access  Private (Admin only)
 */
router.get('/orders/:id', authenticateToken, requireAdmin, adminLimiter, validateOrderId, getAdminOrderById);

/**
 * @route   PUT /api/admin/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin only)
 */
router.put('/orders/:id/status', authenticateToken, requireAdmin, adminLimiter, validateOrderId, validateUpdateOrderStatus, updateOrderStatus);

/**
 * @route   GET /api/admin/orders/statistics
 * @desc    Get order statistics
 * @access  Private (Admin only)
 */
router.get('/orders/statistics', authenticateToken, requireAdmin, adminLimiter, getOrderStatistics);

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
 * @route   GET /api/admin/reports/export/csv
 * @desc    Export reports as CSV
 * @access  Private (Admin only)
 */
router.get('/reports/export/csv', authenticateToken, requireAdmin, exportReportsCSV);

/**
 * @route   GET /api/admin/reports/export/pdf
 * @desc    Export reports as PDF
 * @access  Private (Admin only)
 */
router.get('/reports/export/pdf', authenticateToken, requireAdmin, exportReportsPDF);

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

// Financial Management Routes

/**
 * @route   GET /api/admin/commissions/rate
 * @desc    Get platform commission rate
 * @access  Private (Admin only)
 */
router.get('/commissions/rate', authenticateToken, requireAdmin, adminLimiter, getPlatformSettings);

/**
 * @route   PUT /api/admin/commissions/rate
 * @desc    Update platform commission rate
 * @access  Private (Admin only)
 */
router.put('/commissions/rate', authenticateToken, requireAdmin, adminLimiter, updateCommissionRate);

/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with commission data
 * @access  Private (Admin only)
 */
router.get('/transactions', authenticateToken, requireAdmin, adminLimiter, getTransactions);

/**
 * @route   GET /api/admin/commissions/sellers
 * @desc    Get commission breakdown by seller
 * @access  Private (Admin only)
 */
router.get('/commissions/sellers', authenticateToken, requireAdmin, adminLimiter, getCommissionsBySeller);

/**
 * @route   GET /api/admin/withdrawals
 * @desc    Get all withdrawal requests
 * @access  Private (Admin only)
 */
router.get('/withdrawals', authenticateToken, requireAdmin, adminLimiter, getWithdrawalRequests);

/**
 * @route   POST /api/admin/withdrawals
 * @desc    Create withdrawal request (seller only)
 * @access  Private (Seller)
 */
router.post('/withdrawals', authenticateToken, requireSeller, createWithdrawalRequest);

/**
 * @route   POST /api/admin/withdrawals/:id/approve
 * @desc    Approve withdrawal request
 * @access  Private (Admin only)
 */
router.post('/withdrawals/:id/approve', authenticateToken, requireAdmin, adminLimiter, approveWithdrawal);

/**
 * @route   POST /api/admin/withdrawals/:id/reject
 * @desc    Reject withdrawal request
 * @access  Private (Admin only)
 */
router.post('/withdrawals/:id/reject', authenticateToken, requireAdmin, adminLimiter, rejectWithdrawal);

// Export Routes

/**
 * @route   GET /api/admin/transactions/export/csv
 * @desc    Export transactions as CSV
 * @access  Private (Admin only)
 */
router.get('/transactions/export/csv', authenticateToken, requireAdmin, exportTransactionsCSV);

/**
 * @route   GET /api/admin/transactions/export/pdf
 * @desc    Export transactions as PDF
 * @access  Private (Admin only)
 */
router.get('/transactions/export/pdf', authenticateToken, requireAdmin, exportTransactionsPDF);

/**
 * @route   GET /api/admin/withdrawals/export/csv
 * @desc    Export withdrawals as CSV
 * @access  Private (Admin only)
 */
router.get('/withdrawals/export/csv', authenticateToken, requireAdmin, exportWithdrawalsCSV);

/**
 * @route   GET /api/admin/withdrawals/export/pdf
 * @desc    Export withdrawals as PDF
 * @access  Private (Admin only)
 */
router.get('/withdrawals/export/pdf', authenticateToken, requireAdmin, exportWithdrawalsPDF);

module.exports = router;
