const { query } = require('../config/db');
const { body, param, validationResult } = require('express-validator');

// Submit a rating for a product
const submitRating = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const buyerId = req.user.userId;
    const { product_id, order_id, rating, review } = req.body;

    // Check if product exists
    const productResult = await query('SELECT id FROM products WHERE id = $1', [product_id]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if order belongs to buyer and is delivered (for verified purchase)
    let isVerifiedPurchase = false;
    if (order_id) {
      const orderResult = await query(
        'SELECT id, status, buyer_id FROM orders WHERE id = $1 AND buyer_id = $2',
        [order_id, buyerId]
      );
      if (orderResult.rows.length > 0 && orderResult.rows[0].status === 'delivered') {
        isVerifiedPurchase = true;
      }
    }

    // Check if user already rated this product
    const existingRating = await query(
      'SELECT id FROM product_ratings WHERE product_id = $1 AND buyer_id = $2',
      [product_id, buyerId]
    );

    if (existingRating.rows.length > 0) {
      // Update existing rating
      const updateResult = await query(
        `UPDATE product_ratings 
         SET rating = $1, review = $2, is_verified_purchase = COALESCE($3, is_verified_purchase), updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $1 AND buyer_id = $4
         RETURNING *`,
        [rating, review || null, isVerifiedPurchase, buyerId]
      );

      return res.status(200).json({
        success: true,
        message: 'Rating updated successfully',
        data: updateResult.rows[0],
      });
    }

    // Insert new rating
    const insertResult = await query(
      `INSERT INTO product_ratings (product_id, buyer_id, order_id, rating, review, is_verified_purchase)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [product_id, buyerId, order_id || null, rating, review || null, isVerifiedPurchase]
    );

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get ratings for a product
const getProductRatings = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 50);

    // Get ratings
    const ratingsResult = await query(
      `SELECT pr.*, u.name as buyer_name
       FROM product_ratings pr
       JOIN users u ON pr.buyer_id = u.id
       WHERE pr.product_id = $1
       ORDER BY pr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, parsedLimit, offset]
    );

    // Get average rating
    const avgResult = await query(
      `SELECT 
         COUNT(*) as total_ratings,
         COALESCE(AVG(rating), 0) as average_rating,
         COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) as five_star,
         COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) as four_star,
         COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) as three_star,
         COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) as two_star,
         COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) as one_star
       FROM product_ratings WHERE product_id = $1`,
      [productId]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM product_ratings WHERE product_id = $1',
      [productId]
    );

    res.status(200).json({
      success: true,
      message: 'Product ratings retrieved successfully',
      data: {
        ratings: ratingsResult.rows,
        average_rating: parseFloat(avgResult.rows[0].average_rating).toFixed(1),
        total_ratings: parseInt(avgResult.rows[0].total_ratings),
        rating_breakdown: {
          5: parseInt(avgResult.rows[0].five_star),
          4: parseInt(avgResult.rows[0].four_star),
          3: parseInt(avgResult.rows[0].three_star),
          2: parseInt(avgResult.rows[0].two_star),
          1: parseInt(avgResult.rows[0].one_star),
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(parseInt(countResult.rows[0].total) / parsedLimit),
          total_count: parseInt(countResult.rows[0].total),
        },
      },
    });
  } catch (error) {
    console.error('Error getting product ratings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get buyer's rating for a specific product
const getUserRatingForProduct = async (req, res) => {
  try {
    const buyerId = req.user.userId;
    const { productId } = req.params;

    const result = await query(
      'SELECT * FROM product_ratings WHERE product_id = $1 AND buyer_id = $2',
      [productId, buyerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Rating retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting user rating:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get products that buyer can rate (delivered orders)
const getRatableOrders = async (req, res) => {
  try {
    const buyerId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 50);

    // Get delivered orders with products that haven't been rated
    const ordersResult = await query(
      `SELECT DISTINCT o.id as order_id, o.created_at as order_date, o.status as order_status, o.delivered_at,
              p.id as product_id, p.title as product_name, 
              (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as primary_image
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_ratings pr ON pr.product_id = p.id AND pr.buyer_id = o.buyer_id
       WHERE o.buyer_id = $1 AND o.status = 'delivered' AND pr.id IS NULL
       ORDER BY o.delivered_at DESC
       LIMIT $2 OFFSET $3`,
      [buyerId, parsedLimit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(DISTINCT o.id) as total
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_ratings pr ON pr.product_id = p.id AND pr.buyer_id = o.buyer_id
       WHERE o.buyer_id = $1 AND o.status = 'delivered' AND pr.id IS NULL`,
      [buyerId]
    );

    res.status(200).json({
      success: true,
      message: 'Ratable orders retrieved successfully',
      data: {
        orders: ordersResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(parseInt(countResult.rows[0].total) / parsedLimit),
          total_count: parseInt(countResult.rows[0].total),
        },
      },
    });
  } catch (error) {
    console.error('Error getting ratable orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Validation rules
const submitRatingValidation = [
  body('product_id').isInt({ min: 1 }).withMessage('Product ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().isString().isLength({ max: 1000 }).withMessage('Review must be less than 1000 characters'),
  body('order_id').optional().isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
];

const productIdValidation = [
  param('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
];

module.exports = {
  submitRating,
  getProductRatings,
  getUserRatingForProduct,
  getRatableOrders,
  submitRatingValidation,
  productIdValidation,
};
