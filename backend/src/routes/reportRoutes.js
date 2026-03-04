const express = require('express');
const {
  createProductReport,
  getProductReports,
  getAllReports,
  updateReportStatus,
  getReportStatistics,
  createReportValidation,
  updateReportStatusValidation,
} = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireBuyer, requireAdmin } = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const router = express.Router();

// Public/Buyer routes
router.post(
  '/reports',
  authenticateToken,
  requireBuyer,
  createReportValidation,
  handleValidationErrors,
  createProductReport
);

// Admin only routes
router.get(
  '/admin/reports',
  authenticateToken,
  requireAdmin,
  getAllReports
);

router.get(
  '/admin/reports/statistics',
  authenticateToken,
  requireAdmin,
  getReportStatistics
);

router.get(
  '/admin/reports/product/:productId',
  authenticateToken,
  requireAdmin,
  getProductReports
);

router.put(
  '/admin/reports/:id/status',
  authenticateToken,
  requireAdmin,
  updateReportStatusValidation,
  handleValidationErrors,
  updateReportStatus
);

module.exports = router;
