const { query } = require('../config/db');
const { body, param, validationResult } = require('express-validator');

// Validation rules for order creation
const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
];

// Validation rules for order status update
const updateOrderStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
];

// Validation rules for order ID parameter
const orderIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
];

// Get all orders for a buyer
const getBuyerOrders = async (req, res) => {
  try {
    const buyerId = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;
    
    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);
    
    // Build WHERE conditions
    const conditions = ['o.buyer_id = $1'];
    const params = [buyerId];
    let paramIndex = 2;
    
    if (status) {
      conditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const ordersQuery = `
      SELECT 
        o.id, o.status, o.total_amount, o.payment_status, o.payment_method,
        o.courier_name, o.tracking_number, o.created_at, o.updated_at,
        o.delivered_at, o.shipped_at,
        u.name as buyer_name, u.phone as buyer_phone,
        o.shipping_address, o.shipping_city
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
    `;
    
    params.push(parsedLimit, offset);
    
    // Get orders first
    const ordersResult = await query(ordersQuery, params);
    
    // Then get items separately for each order
    if (ordersResult.rows.length > 0) {
      const orderIds = ordersResult.rows.map(o => o.id);
      
      const itemsQuery = `
        SELECT 
          oi.order_id,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'product_id', oi.product_id,
              'title', p.title, 
              'quantity', oi.quantity, 
              'price', oi.price_at_purchase,
              'store_name', s.name
            )
          ) as items
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN stores s ON p.store_id = s.id
        WHERE oi.order_id = ANY($1)
        GROUP BY oi.order_id
      `;
      
      const itemsResult = await query(itemsQuery, [orderIds]);
      
      // Create a map of order_id to items
      const itemsMap = {};
      itemsResult.rows.forEach(row => {
        itemsMap[row.order_id] = row.items;
      });
      
      // Attach items to orders
      ordersResult.rows.forEach(order => {
        order.items = itemsMap[order.id] || [];
      });
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      ${whereClause}
    `;
    
    const countParams = params.slice(0, -2);
    
    const countResult = await query(countQuery, countParams);
    
    const totalOrders = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalOrders / parsedLimit);
    
    res.status(200).json({
      success: true,
      message: 'Buyer orders retrieved successfully',
      data: {
        orders: ordersResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_orders: totalOrders,
          orders_per_page: parsedLimit,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error getting buyer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get order by ID with items
const getOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Check if user has permission to view this order
    let whereClause = 'o.id = $1';
    let params = [orderId];
    
    if (userRole === 'buyer') {
      whereClause += ' AND o.buyer_id = $2';
      params.push(userId);
    } else if (userRole === 'seller') {
      // For sellers, check if order contains their products
      whereClause += ' AND EXISTS (SELECT 1 FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id LEFT JOIN stores s ON p.store_id = s.id WHERE oi.order_id = o.id AND s.owner_id = $2)';
      params.push(userId);
    }
    
    const orderQuery = `
      SELECT 
        o.id, o.status, o.total_amount, o.payment_status, o.created_at, o.updated_at,
        u.name as buyer_name, u.email as buyer_email
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      WHERE ${whereClause}
    `;
    
    const orderResult = await query(orderQuery, params);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied',
      });
    }
    
    // Get order items with product details
    const itemsQuery = `
      SELECT 
        oi.id, oi.quantity, oi.price_at_purchase, oi.created_at,
        p.id as product_id, p.title, p.description,
        s.name as store_name, s.owner_id,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as product_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
    `;
    
    const itemsResult = await query(itemsQuery, [orderId]);
    
    const order = orderResult.rows[0];
    order.items = itemsResult.rows;
    
    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error getting order by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Create new order (Buyer only)
const createOrder = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }
    
    const buyerId = req.user.userId;
    const { items } = req.body;
    
    // Validate all products and calculate total
    const productIds = items.map(item => item.product_id);
    const productsQuery = `
      SELECT p.id, p.title, p.price, p.stock, p.is_active, p.store_id, s.name as store_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.id = ANY($1) AND p.is_active = true
    `;
    
    const productsResult = await query(productsQuery, [productIds]);
    
    if (productsResult.rows.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more products not found or not available',
      });
    }
    
    // Check stock availability and calculate total
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = productsResult.rows.find(p => p.id === item.product_id);
      
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.title}`,
        });
      }
      
      const itemTotal = parseFloat(product.price) * item.quantity;
      totalAmount += itemTotal;
      
      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: product.price,
      });
    }
    
    // Start transaction
    const client = await require('../config/db').pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create order
      const createOrderQuery = `
        INSERT INTO orders (buyer_id, total_amount, payment_status)
        VALUES ($1, $2, 'pending')
        RETURNING id, status, total_amount, payment_status, created_at, updated_at
      `;
      
      const newOrderResult = await client.query(createOrderQuery, [buyerId, totalAmount]);
      const newOrder = newOrderResult.rows[0];
      
      // Create order items and update product stock
      for (const item of orderItems) {
        // Create order item
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
          [newOrder.id, item.product_id, item.quantity, item.price_at_purchase]
        );
        
        // Update product stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: newOrder,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update order status (Admin only)
const updateOrderStatus = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }
    
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    
    // Check if order exists
    const existingOrder = await query(
      'SELECT id, status FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    
    const currentStatus = existingOrder.rows[0].status;
    
    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [], // Final state
      'cancelled': [], // Final state
    };
    
    if (!validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change order status from ${currentStatus} to ${status}`,
      });
    }
    
    // Update order status
    const updateQuery = `
      UPDATE orders
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, status, total_amount, payment_status, created_at, updated_at
    `;
    
    const updatedOrderResult = await query(updateQuery, [status, orderId]);
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrderResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Cancel order (Buyer only, only for pending orders)
const cancelOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const buyerId = req.user.userId;
    
    // Check if order exists and belongs to buyer
    const orderQuery = `
      SELECT id, status, buyer_id
      FROM orders
      WHERE id = $1 AND buyer_id = $2
    `;
    
    const orderResult = await query(orderQuery, [orderId, buyerId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied',
      });
    }
    
    const order = orderResult.rows[0];
    
    // Check if order can be cancelled (only pending orders)
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled',
      });
    }
    
    // Start transaction to restore stock
    const client = await require('../config/db').pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get order items to restore stock
      const itemsQuery = `
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = $1
      `;
      
      const itemsResult = await client.query(itemsQuery, [orderId]);
      
      // Restore product stock
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
      
      // Update order status
      await client.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['cancelled', orderId]
      );
      
      await client.query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get seller's orders (orders containing seller's products)
const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;
    
    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);
    
    // Build WHERE conditions
    const conditions = ['s.owner_id = $1'];
    const params = [sellerId];
    let paramIndex = 2;
    
    if (status) {
      conditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const ordersQuery = `
      SELECT DISTINCT
        o.id, o.status, o.total_amount, o.payment_status, o.created_at, o.updated_at,
        u.name as buyer_name, u.email as buyer_email
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parsedLimit, offset);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      ${whereClause}
    `;
    
    const countParams = params.slice(0, -2);
    
    const countResult = await query(countQuery, countParams);
    
    const totalOrders = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalOrders / parsedLimit);
    
    res.status(200).json({
      success: true,
      message: 'Seller orders retrieved successfully',
      data: {
        orders: ordersResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_orders: totalOrders,
          orders_per_page: parsedLimit,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error getting seller orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getBuyerOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getSellerOrders,
  createOrderValidation,
  updateOrderStatusValidation,
  orderIdValidation,
};
