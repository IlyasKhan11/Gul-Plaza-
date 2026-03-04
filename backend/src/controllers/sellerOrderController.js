const { query } = require('../config/db');
const {
  isValidStatusTransition,
  canShipOrder,
  VALIDATION_ERRORS
} = require('../helpers/orderStateValidation');
const whatsappService = require('../services/whatsappService');

// Get Seller's Orders (orders containing seller's products)
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
        o.id, o.status, o.total_amount, o.payment_status, o.payment_method,
        o.shipping_address, o.shipping_city, o.shipping_country, o.shipping_postal_code, o.shipping_phone,
        o.courier_name, o.tracking_number, o.seller_confirmed_at, o.seller_notes,
        o.created_at, o.updated_at,
        u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone
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
    
    const [ordersResult, countResult] = await Promise.all([
      query(ordersQuery, params),
      query(countQuery, countParams),
    ]);
    
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

// Get Seller Order by ID with items
const getSellerOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const sellerId = req.user.userId;
    
    // Check if order contains seller's products
    const orderQuery = `
      SELECT DISTINCT
        o.id, o.status, o.total_amount, o.payment_status, o.payment_method,
        o.shipping_address, o.shipping_city, o.shipping_country, o.shipping_postal_code, o.shipping_phone,
        o.courier_name, o.tracking_number, o.seller_confirmed_at, o.seller_notes,
        o.created_at, o.updated_at,
        u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE o.id = $1 AND s.owner_id = $2
    `;
    
    const orderResult = await query(orderQuery, [orderId, sellerId]);
    
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
        s.name as store_name, s.owner_id
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE oi.order_id = $1 AND s.owner_id = $2
      ORDER BY oi.id ASC
    `;
    
    const itemsResult = await query(itemsQuery, [orderId, sellerId]);
    
    const order = orderResult.rows[0];
    order.items = itemsResult.rows;
    
    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error getting seller order by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Confirm Order (Seller Only)
const confirmOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const sellerId = req.user.userId;
    const { notes } = req.body;
    
    // Verify order contains seller's products and can be confirmed
    const orderQuery = `
      SELECT o.id, o.status, o.payment_method, o.seller_confirmed_at
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE o.id = $1 AND s.owner_id = $2
    `;
    
    const orderResult = await query(orderQuery, [orderId, sellerId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied',
      });
    }
    
    const order = orderResult.rows[0];
    
    // Check if order is already confirmed
    if (order.seller_confirmed_at) {
      return res.status(400).json({
        success: false,
        message: 'Order is already confirmed',
      });
    }
    
    // Check if order can be confirmed (must be CONFIRMED status for COD)
    if (order.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Order with status ${order.status} cannot be confirmed. Only CONFIRMED orders can be confirmed.`,
      });
    }
    
    // Update order with seller confirmation
    const updateQuery = `
      UPDATE orders 
      SET seller_confirmed_at = CURRENT_TIMESTAMP,
          seller_notes = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, status, seller_confirmed_at, seller_notes, updated_at
    `;
    
    const updatedOrderResult = await query(updateQuery, [notes, orderId]);
    const updatedOrder = updatedOrderResult.rows[0];
    
    // Create notification for buyer
    await query(
      `INSERT INTO order_notifications (order_id, seller_id, notification_type, message) 
       VALUES ($1, $2, 'order_confirmed', $3)`,
      [orderId, sellerId, `Your order #${orderId} has been confirmed by the seller.`]
    );

    // Send WhatsApp notification to buyer
    try {
      const buyerQuery = `SELECT name, phone FROM users WHERE id = (SELECT buyer_id FROM orders WHERE id = $1)`;
      const buyerResult = await query(buyerQuery, [orderId]);
      
      if (buyerResult.rows.length > 0) {
        const buyer = buyerResult.rows[0];
        const orderData = { id: orderId, total_amount: order.total_amount, payment_method: order.payment_method };
        
        const whatsappResult = await whatsappService.sendOrderConfirmation(orderData, buyer);
        
        if (whatsappResult.success) {
          // Update notification to mark WhatsApp as sent
          await query(
            `UPDATE order_notifications SET whatsapp_sent = true, whatsapp_message_id = $1 
             WHERE order_id = $2 AND notification_type = 'order_confirmed' AND seller_id = $3`,
            [whatsappResult.messageId, orderId, sellerId]
          );
        }
      }
    } catch (whatsappError) {
      console.error('WhatsApp notification failed:', whatsappError);
      // Don't fail the request if WhatsApp fails
    }
    
    res.status(200).json({
      success: true,
      message: 'Order confirmed successfully',
      data: updatedOrder,
    });
    
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Ship Order with Tracking (Seller Only)
const shipOrderWithTracking = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const sellerId = req.user.userId;
    const { courier_name, tracking_number } = req.body;
    
    // Validate required fields
    if (!courier_name || !tracking_number) {
      return res.status(400).json({
        success: false,
        message: 'Courier name and tracking number are required',
      });
    }
    
    // Verify order contains seller's products and can be shipped
    const orderQuery = `
      SELECT o.id, o.status, o.payment_method, o.seller_confirmed_at
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE o.id = $1 AND s.owner_id = $2
    `;
    
    const orderResult = await query(orderQuery, [orderId, sellerId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied',
      });
    }
    
    const order = orderResult.rows[0];
    
    // Check if order can be shipped
    if (!canShipOrder(order.status)) {
      return res.status(400).json({
        success: false,
        message: VALIDATION_ERRORS.ORDER_NOT_SHIPPABLE(order.status),
      });
    }
    
    // For COD orders, check if seller has confirmed
    if (order.payment_method === 'cod' && !order.seller_confirmed_at) {
      return res.status(400).json({
        success: false,
        message: 'COD orders must be confirmed before shipping',
      });
    }
    
    // Start transaction
    const client = await require('../config/db').pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update order with shipping information
      const updateQuery = `
        UPDATE orders 
        SET status = 'shipped',
            courier_name = $1,
            tracking_number = $2,
            shipped_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, status, courier_name, tracking_number, shipped_at, updated_at
      `;
      
      const updatedOrderResult = await client.query(updateQuery, [
        courier_name, tracking_number, orderId
      ]);
      
      const updatedOrder = updatedOrderResult.rows[0];
      
      // Create notification for buyer
      await client.query(
        `INSERT INTO order_notifications (order_id, seller_id, notification_type, message) 
         VALUES ($1, $2, 'order_shipped', $3)`,
        [orderId, sellerId, `Your order #${orderId} has been shipped via ${courier_name}. Tracking: ${tracking_number}`]
      );

      // Send WhatsApp notification to buyer
      try {
        const buyerQuery = `SELECT name, phone FROM users WHERE id = (SELECT buyer_id FROM orders WHERE id = $1)`;
        const buyerResult = await client.query(buyerQuery, [orderId]);
        
        if (buyerResult.rows.length > 0) {
          const buyer = buyerResult.rows[0];
          const orderData = { 
            id: orderId, 
            total_amount: order.total_amount, 
            courier_name, 
            tracking_number 
          };
          
          const whatsappResult = await whatsappService.sendOrderShipped(orderData, buyer);
          
          if (whatsappResult.success) {
            // Update notification to mark WhatsApp as sent
            await client.query(
              `UPDATE order_notifications SET whatsapp_sent = true, whatsapp_message_id = $1 
               WHERE order_id = $2 AND notification_type = 'order_shipped' AND seller_id = $3`,
              [whatsappResult.messageId, orderId, sellerId]
            );
          }
        }
      } catch (whatsappError) {
        console.error('WhatsApp notification failed:', whatsappError);
        // Don't fail the transaction if WhatsApp fails
      }
      
      await client.query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: 'Order shipped successfully',
        data: updatedOrder,
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error shipping order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get Seller Notifications
const getSellerNotifications = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { page = 1, limit = 20, is_read } = req.query;
    
    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);
    
    // Build WHERE conditions
    const conditions = ['seller_id = $1'];
    const params = [sellerId];
    let paramIndex = 2;
    
    if (is_read !== undefined) {
      conditions.push(`is_read = $${paramIndex}`);
      params.push(is_read === 'true');
      paramIndex++;
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const notificationsQuery = `
      SELECT 
        id, order_id, notification_type, message, is_read, 
        whatsapp_sent, whatsapp_message_id, created_at, updated_at
      FROM order_notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parsedLimit, offset);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM order_notifications
      ${whereClause}
    `;
    
    const countParams = params.slice(0, -2);
    
    const [notificationsResult, countResult] = await Promise.all([
      query(notificationsQuery, params),
      query(countQuery, countParams),
    ]);
    
    const totalNotifications = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalNotifications / parsedLimit);
    
    res.status(200).json({
      success: true,
      message: 'Seller notifications retrieved successfully',
      data: {
        notifications: notificationsResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_notifications: totalNotifications,
          notifications_per_page: parsedLimit,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error getting seller notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Mark Notification as Read
const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const sellerId = req.user.userId;
    
    // Update notification
    const updateQuery = `
      UPDATE order_notifications 
      SET is_read = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND seller_id = $2
      RETURNING id, is_read, updated_at
    `;
    
    const result = await query(updateQuery, [notificationId, sellerId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getSellerOrders,
  getSellerOrderById,
  confirmOrder,
  shipOrderWithTracking,
  getSellerNotifications,
  markNotificationAsRead,
};
