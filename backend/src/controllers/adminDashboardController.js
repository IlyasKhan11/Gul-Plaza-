const { query } = require('../config/db');
const { body, param, query: queryValidator, validationResult } = require('express-validator');

// Validation rules for dashboard analytics
const dashboardSummaryValidation = [];
const salesReportValidation = [
  queryValidator('start_date').isISO8601().withMessage('Start date must be a valid date'),
  queryValidator('end_date').isISO8601().withMessage('End date must be a valid date'),
];

// Get dashboard summary
const getDashboardSummary = async (req, res) => {
  try {
    // Get total users
    const totalUsersResult = await query('SELECT COUNT(*) as count FROM users');
    const total_users = parseInt(totalUsersResult.rows[0].count);

    // Get total products (not deleted)
    const totalProductsResult = await query('SELECT COUNT(*) as count FROM products WHERE is_deleted = false');
    const total_products = parseInt(totalProductsResult.rows[0].count);

    // Get total orders
    const totalOrdersResult = await query('SELECT COUNT(*) as count FROM orders');
    const total_orders = parseInt(totalOrdersResult.rows[0].count);

    // Get total revenue (only paid orders)
    const totalRevenueResult = await query('SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE payment_status = $1', ['paid']);
    const total_revenue = parseFloat(totalRevenueResult.rows[0].revenue);

    // Get pending orders
    const pendingOrdersResult = await query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['pending']);
    const pending_orders = parseInt(pendingOrdersResult.rows[0].count);

    // Get low stock products count (stock < 5 and not deleted)
    const lowStockResult = await query('SELECT COUNT(*) as count FROM products WHERE stock < 5 AND is_deleted = false');
    const low_stock_products_count = parseInt(lowStockResult.rows[0].count);

    // Get total stores
    const totalStoresResult = await query('SELECT COUNT(*) as count FROM stores');
    const total_stores = parseInt(totalStoresResult.rows[0].count);

    // Get pending reports count
    const pendingReportsResult = await query('SELECT COUNT(*) as count FROM product_reports WHERE status = $1', ['pending']);
    const pending_reports = parseInt(pendingReportsResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: {
        total_users,
        total_products,
        total_orders,
        total_stores,
        total_revenue,
        pending_orders,
        pending_reports,
        low_stock_products_count,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get sales report
const getSalesReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999); // Include end date

    // Get sales data grouped by day
    const salesQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders 
      WHERE payment_status = $1 
        AND created_at >= $2 
        AND created_at <= $3
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const salesResult = await query(salesQuery, ['paid', startDate, endDate]);

    // Calculate totals
    const total_orders = salesResult.rows.reduce((sum, row) => sum + parseInt(row.total_orders), 0);
    const total_revenue = salesResult.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0);

    res.status(200).json({
      success: true,
      data: {
        total_orders,
        total_revenue,
        daily_sales: salesResult.rows.map(row => ({
          date: row.date,
          total_orders: parseInt(row.total_orders),
          total_revenue: parseFloat(row.total_revenue),
        })),
      },
    });
  } catch (error) {
    console.error('Error getting sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get top products
const getTopProducts = async (req, res) => {
  try {
    const topProductsQuery = `
      SELECT 
        p.id,
        p.title,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE p.is_deleted = false 
        AND o.payment_status = $1
      GROUP BY p.id, p.title
      ORDER BY total_sold DESC
      LIMIT 5
    `;

    const topProductsResult = await query(topProductsQuery, ['paid']);

    res.status(200).json({
      success: true,
      data: topProductsResult.rows.map(row => ({
        id: parseInt(row.id),
        title: row.title,
        total_sold: parseInt(row.total_sold),
        total_revenue: parseFloat(row.total_revenue),
      })),
    });
  } catch (error) {
    console.error('Error getting top products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get low stock products
const getLowStockProducts = async (req, res) => {
  try {
    const lowStockQuery = `
      SELECT 
        p.id,
        p.title,
        p.stock,
        p.price,
        s.name as store_name,
        u.email as seller_email
      FROM products p
      JOIN stores s ON p.store_id = s.id
      JOIN users u ON p.seller_id = u.id
      WHERE p.stock < 5 
        AND p.is_deleted = false 
        AND p.is_active = true
      ORDER BY p.stock ASC
    `;

    const lowStockResult = await query(lowStockQuery);

    res.status(200).json({
      success: true,
      data: lowStockResult.rows.map(row => ({
        id: parseInt(row.id),
        title: row.title,
        stock: parseInt(row.stock),
        price: parseFloat(row.price),
        store_name: row.store_name,
        seller_email: row.seller_email,
      })),
      count: lowStockResult.rows.length,
    });
  } catch (error) {
    console.error('Error getting low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getDashboardSummary,
  getSalesReport,
  getTopProducts,
  getLowStockProducts,
  dashboardSummaryValidation,
  salesReportValidation,
};
