const { query } = require('../config/db');
const { body, param, validationResult } = require('express-validator');

// Validation rules for creating a product report
const createReportValidation = [
  body('product_id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
  body('reason').isIn(['inappropriate_content', 'fake_product', 'misleading_description', 'spam', 'copyright_violation', 'other'])
    .withMessage('Invalid report reason'),
  body('description').optional({ checkFalsy: true }).isLength({ min: 10, max: 1000 }).trim().escape()
    .withMessage('Description must be between 10 and 1000 characters'),
];

// Validation rules for updating report status (Admin only)
const updateReportStatusValidation = [
  param('id').isInt({ min: 1 }).withMessage('Report ID must be a positive integer'),
  body('status').isIn(['pending', 'under_review', 'resolved', 'dismissed'])
    .withMessage('Invalid status'),
  body('admin_notes').optional().isLength({ max: 1000 }).trim().escape()
    .withMessage('Admin notes must be less than 1000 characters'),
];

// Create a product report (Buyer only)
const createProductReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id, reason, description } = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if product exists and is active
    const productResult = await query(
      'SELECT id, title, seller_id FROM products WHERE id = $1 AND is_active = true AND is_deleted = false',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not available'
      });
    }

    // Check if user already reported this product
    const existingReportResult = await query(
      'SELECT id FROM product_reports WHERE product_id = $1 AND reporter_id = $2',
      [product_id, userId]
    );

    if (existingReportResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this product'
      });
    }

    // Create the report
    const reportResult = await query(
      `INSERT INTO product_reports (product_id, reporter_id, reason, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_id, userId, reason, description]
    );

    const report = reportResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'Product report submitted successfully',
      data: {
        id: report.id,
        product_id: report.product_id,
        reason: report.reason,
        status: report.status,
        created_at: report.created_at
      }
    });

  } catch (error) {
    console.error('Error creating product report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all reports for a product (Admin only)
const getProductReports = async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { page = 1, limit = 20, status } = req.query;

    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);

    // Build WHERE conditions
    const conditions = ['pr.product_id = $1'];
    const queryParams = [productId];

    if (status) {
      conditions.push(`pr.status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // Get reports with product and reporter information
    const reportsQuery = `
      SELECT 
        pr.id,
        pr.reason,
        pr.description,
        pr.status,
        pr.admin_notes,
        pr.reviewed_by,
        pr.reviewed_at,
        pr.created_at,
        pr.updated_at,
        p.title as product_title,
        p.seller_id,
        reporter.name as reporter_name,
        reporter.email as reporter_email,
        reviewer.name as reviewer_name
      FROM product_reports pr
      JOIN products p ON pr.product_id = p.id
      JOIN users reporter ON pr.reporter_id = reporter.id
      LEFT JOIN users reviewer ON pr.reviewed_by = reviewer.id
      WHERE ${whereClause}
      ORDER BY pr.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(parsedLimit, offset);
    const reportsResult = await query(reportsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM product_reports pr
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const totalReports = parseInt(countResult.rows[0].total);

    res.status(200).json({
      success: true,
      message: 'Product reports retrieved successfully',
      data: {
        reports: reportsResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalReports / parsedLimit),
          total_reports: totalReports,
          per_page: parsedLimit
        }
      }
    });

  } catch (error) {
    console.error('Error getting product reports:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all reports (Admin only)
const getAllReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      reason,
      start_date,
      end_date
    } = req.query;

    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);

    // Build WHERE conditions
    const conditions = [];
    const queryParams = [];

    if (status) {
      conditions.push(`pr.status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }

    if (reason) {
      conditions.push(`pr.reason = $${queryParams.length + 1}`);
      queryParams.push(reason);
    }

    if (start_date) {
      conditions.push(`pr.created_at >= $${queryParams.length + 1}`);
      queryParams.push(start_date);
    }

    if (end_date) {
      conditions.push(`pr.created_at <= $${queryParams.length + 1}`);
      queryParams.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get reports with product and reporter information
    const reportsQuery = `
      SELECT 
        pr.id,
        pr.product_id,
        pr.reason,
        pr.description,
        pr.status,
        pr.admin_notes,
        pr.reviewed_by,
        pr.reviewed_at,
        pr.created_at,
        pr.updated_at,
        p.title as product_title,
        p.price as product_price,
        s.name as store_name,
        reporter.name as reporter_name,
        reporter.email as reporter_email,
        reviewer.name as reviewer_name
      FROM product_reports pr
      JOIN products p ON pr.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      JOIN users reporter ON pr.reporter_id = reporter.id
      LEFT JOIN users reviewer ON pr.reviewed_by = reviewer.id
      ${whereClause}
      ORDER BY pr.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(parsedLimit, offset);
    const reportsResult = await query(reportsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM product_reports pr
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const totalReports = parseInt(countResult.rows[0].total);

    res.status(200).json({
      success: true,
      message: 'Reports retrieved successfully',
      data: {
        reports: reportsResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalReports / parsedLimit),
          total_reports: totalReports,
          per_page: parsedLimit
        }
      }
    });

  } catch (error) {
    console.error('Error getting all reports:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update report status (Admin only)
const updateReportStatus = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const reportId = parseInt(req.params.id);
    const { status, admin_notes } = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if report exists
    const existingReportResult = await query(
      'SELECT id, status FROM product_reports WHERE id = $1',
      [reportId]
    );

    if (existingReportResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const currentStatus = existingReportResult.rows[0].status;

    // Prevent updating resolved or dismissed reports
    if (currentStatus === 'resolved' || currentStatus === 'dismissed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a resolved or dismissed report'
      });
    }

    // Update the report
    const updateQuery = `
      UPDATE product_reports 
      SET status = $1, 
          admin_notes = $2, 
          reviewed_by = $3, 
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const updateResult = await query(updateQuery, [status, admin_notes, adminId, reportId]);
    const updatedReport = updateResult.rows[0];

    res.status(200).json({
      success: true,
      message: 'Report status updated successfully',
      data: updatedReport
    });

  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get report statistics (Admin only)
const getReportStatistics = async (req, res) => {
  try {
    // Get total reports by status
    const statusStatsResult = await query(`
      SELECT status, COUNT(*) as count
      FROM product_reports
      GROUP BY status
    `);

    // Get total reports by reason
    const reasonStatsResult = await query(`
      SELECT reason, COUNT(*) as count
      FROM product_reports
      GROUP BY reason
    `);

    // Get recent reports (last 7 days)
    const recentReportsResult = await query(`
      SELECT COUNT(*) as count
      FROM product_reports
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);

    // Get most reported products
    const mostReportedResult = await query(`
      SELECT 
        p.id,
        p.title,
        COUNT(pr.id) as report_count
      FROM products p
      JOIN product_reports pr ON p.id = pr.product_id
      GROUP BY p.id, p.title
      HAVING COUNT(pr.id) > 0
      ORDER BY report_count DESC
      LIMIT 10
    `);

    const statusStats = statusStatsResult.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    const reasonStats = reasonStatsResult.rows.reduce((acc, row) => {
      acc[row.reason] = parseInt(row.count);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'Report statistics retrieved successfully',
      data: {
        total_reports: Object.values(statusStats).reduce((sum, count) => sum + count, 0),
        status_breakdown: statusStats,
        reason_breakdown: reasonStats,
        recent_reports_7_days: parseInt(recentReportsResult.rows[0].count),
        most_reported_products: mostReportedResult.rows
      }
    });

  } catch (error) {
    console.error('Error getting report statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createProductReport,
  getProductReports,
  getAllReports,
  updateReportStatus,
  getReportStatistics,
  createReportValidation,
  updateReportStatusValidation,
};
