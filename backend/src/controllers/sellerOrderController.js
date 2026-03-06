const { query } = require('../config/db');
const {
  isValidStatusTransition,
  canShipOrder,
  VALIDATION_ERRORS
} = require('../helpers/orderStateValidation');
const whatsappService = require('../services/whatsappService');
const notificationService = require('../services/notificationService');

// Get Seller's Orders (orders containing seller's products)
const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;
    
    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);
    
    // Build WHERE conditions
    const conditions = ['p.seller_id = $1'];
    const params = [sellerId];
    let paramIndex = 2;
    
    if (status) {
      conditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // First get the orders without items
    const ordersQuery = `
      SELECT 
        o.id, o.status, o.total_amount, o.payment_status, o.payment_method,
        o.shipping_address, o.shipping_city, o.shipping_country, o.shipping_postal_code, o.shipping_phone,
        o.courier_name, o.tracking_number, o.transaction_id, o.seller_confirmed_at, o.seller_notes,
        o.created_at, o.updated_at,
        u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone,
        s.name as store_name
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      ${whereClause}
      GROUP BY o.id, u.name, u.email, u.phone, s.name
      ORDER BY o.created_at DESC
      LIMIT ${parsedLimit} OFFSET ${offset}
    `;
    
    // Get orders
    const ordersResult = await query(ordersQuery, params);
    
    // Get order IDs to fetch items
    const orderIds = ordersResult.rows.map(r => r.id);
    let itemsMap = {};
    
    if (orderIds.length > 0) {
      // Get items for these orders
      const itemsQuery = `
        SELECT 
          oi.order_id,
          JSON_AGG(JSON_BUILD_OBJECT('title', p.title, 'quantity', oi.quantity, 'price', oi.price_at_purchase)) as items
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ANY($1)
        GROUP BY oi.order_id
      `;
      const itemsResult = await query(itemsQuery, [orderIds]);
      itemsResult.rows.forEach(row => {
        itemsMap[row.order_id] = row.items;
      });
    }
    
    // Add items to each order
    ordersResult.rows.forEach(row => {
      row.items = itemsMap[row.id] || [];
    });
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, params);
    
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
    
    // Check if order can be confirmed (must be PENDING or CONFIRMED status)
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Order with status ${order.status} cannot be confirmed. Only PENDING or CONFIRMED orders can be confirmed.`,
      });
    }
    
    // Determine new status based on current status
    const newStatus = order.status === 'pending' ? 'confirmed' : order.status;
    
    // Update order with seller confirmation and status change
    const updateQuery = `
      UPDATE orders 
      SET status = $1,
          seller_confirmed_at = CURRENT_TIMESTAMP,
          seller_notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, status, seller_confirmed_at, seller_notes, updated_at
    `;
    
    const updatedOrderResult = await query(updateQuery, [newStatus, notes, orderId]);
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
    if ((order.payment_method === 'cod' || order.payment_method === 'COD') && !order.seller_confirmed_at) {
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
      
      // Get buyer info for real-time notification
      const buyerInfoQuery = `SELECT buyer_id, (SELECT name FROM users WHERE id = orders.buyer_id) as buyer_name FROM orders WHERE id = $1`;
      const buyerInfoResult = await client.query(buyerInfoQuery, [orderId]);
      
      if (buyerInfoResult.rows.length > 0) {
        const buyerId = buyerInfoResult.rows[0].buyer_id;
        const buyerName = buyerInfoResult.rows[0].buyer_name;
        
        // Persist + push notification to buyer
        await notificationService.saveNotification(
          buyerId, 'order',
          'Order Shipped',
          `Your order #${orderId} has been shipped via ${courier_name}. Tracking: ${tracking_number || 'N/A'}`,
          '/buyer/orders'
        );
        notificationService.sendToUser(buyerId, notificationService.NotificationEvents.ORDER_SHIPPED, {
          orderId: orderId,
          status: 'shipped',
          courierName: courier_name,
          trackingNumber: tracking_number,
          message: `Your order #${orderId} has been shipped via ${courier_name}`
        });
        
        // Notify admins about shipping
        notificationService.sendToAdmins(notificationService.NotificationEvents.ORDER_STATUS_CHANGED, {
          orderId: orderId,
          status: 'shipped',
          message: `Order #${orderId} has been shipped to ${buyerName}`
        });
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

// Mark order as delivered
const deliverOrder = async (req, res) => {
  const { orderId } = req.params;
  const sellerId = req.user.userId;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required',
    });
  }

  const client = await require('../config/db').pool.connect();

  try {
    await client.query('BEGIN');

    // First verify the order belongs to this seller
    const orderCheckQuery = `
      SELECT o.id, o.status, o.payment_method, o.seller_confirmed_at
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE o.id = $1 AND s.owner_id = $2
    `;
    const orderCheckResult = await client.query(orderCheckQuery, [orderId, sellerId]);

    if (orderCheckResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to your store',
      });
    }

    const order = orderCheckResult.rows[0];

    // Check if order can be marked as delivered (must be shipped)
    if (order.status !== 'shipped') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Only shipped orders can be marked as delivered',
      });
    }

    // Update order to delivered
    const updateQuery = `
      UPDATE orders 
      SET status = 'delivered',
          delivered_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, status, delivered_at, updated_at
    `;

    const updatedOrderResult = await client.query(updateQuery, [orderId]);
    const updatedOrder = updatedOrderResult.rows[0];

    // Create notification for buyer
    await client.query(
      `INSERT INTO order_notifications (order_id, seller_id, notification_type, message) 
       VALUES ($1, $2, 'order_delivered', $3)`,
      [orderId, sellerId, `Your order #${orderId} has been delivered! Thank you for shopping with us.`]
    );

    // Send WhatsApp notification to buyer
    try {
      const buyerQuery = `SELECT name, phone FROM users WHERE id = (SELECT buyer_id FROM orders WHERE id = $1)`;
      const buyerResult = await client.query(buyerQuery, [orderId]);

      if (buyerResult.rows.length > 0) {
        const buyer = buyerResult.rows[0];
        const message = `✅ Order Delivered!

Order #${orderId}

Your order has been delivered successfully!
Thank you for shopping with Gul Plaza.

Rate your experience: https://gulplaza.com/feedback/${orderId}`;

        console.log('📱 WhatsApp Message (Development Mode):', {
          to: buyer.phone,
          message,
          type: 'text',
          timestamp: new Date().toISOString()
        });

        await client.query(
          `UPDATE order_notifications SET whatsapp_sent = true, whatsapp_message_id = $1 
           WHERE order_id = $2 AND notification_type = 'order_delivered' AND seller_id = $3`,
          ['dev-' + Date.now(), orderId, sellerId]
        );
      }
    } catch (whatsappError) {
      console.error('WhatsApp notification error:', whatsappError);
    }

    // Get buyer info for real-time notification
    const buyerInfoQuery = `SELECT buyer_id, (SELECT name FROM users WHERE id = orders.buyer_id) as buyer_name FROM orders WHERE id = $1`;
    const buyerInfoResult = await client.query(buyerInfoQuery, [orderId]);
    
    if (buyerInfoResult.rows.length > 0) {
      const buyerId = buyerInfoResult.rows[0].buyer_id;
      const buyerName = buyerInfoResult.rows[0].buyer_name;
      
      // Persist + push notification to buyer
      await notificationService.saveNotification(
        buyerId, 'order',
        'Order Delivered',
        `Your order #${orderId} has been delivered! Thank you for shopping with us.`,
        '/buyer/orders'
      );
      notificationService.sendToUser(buyerId, notificationService.NotificationEvents.ORDER_DELIVERED, {
        orderId: orderId,
        status: 'delivered',
        message: `Your order #${orderId} has been delivered!`
      });
      
      // Notify admins about delivery
      notificationService.sendToAdmins(notificationService.NotificationEvents.ORDER_STATUS_CHANGED, {
        orderId: orderId,
        status: 'delivered',
        message: `Order #${orderId} has been delivered to ${buyerName}`
      });
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Order marked as delivered',
      data: updatedOrder,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error delivering order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  } finally {
    client.release();
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

// Get Monthly Revenue for Seller
const getMonthlyRevenue = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { months = 6 } = req.query;
    const parsedMonths = Math.min(parseInt(months), 12);
    
    // Get revenue grouped by month for the last N months
    const revenueQuery = `
      SELECT 
        TO_CHAR(o.created_at, 'YYYY-MM') as month,
        TO_CHAR(o.created_at, 'Mon') as month_name,
        COUNT(*) as order_count,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE s.owner_id = $1
        AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${parsedMonths} months'
        AND o.payment_status IN ('paid', 'verified')
      GROUP BY TO_CHAR(o.created_at, 'YYYY-MM'), TO_CHAR(o.created_at, 'Mon')
      ORDER BY month ASC
    `;
    
    const revenueResult = await query(revenueQuery, [sellerId]);
    
    // Get total revenue
    const totalQuery = `
      SELECT COALESCE(SUM(o.total_amount), 0) as total
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE s.owner_id = $1 AND o.payment_status IN ('paid', 'verified')
    `;
    
    const totalResult = await query(totalQuery, [sellerId]);
    
    res.status(200).json({
      success: true,
      message: 'Monthly revenue retrieved successfully',
      data: {
        monthly_revenue: revenueResult.rows.map(row => ({
          month: row.month,
          month_name: row.month_name,
          order_count: parseInt(row.order_count),
          revenue: parseFloat(row.revenue)
        })),
        total_revenue: parseFloat(totalResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error getting monthly revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get Seller Earnings/Transactions
const getSellerEarnings = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const parsedLimit = Math.min(parseInt(limit), 100);
    const offset = (parseInt(page) - 1) * parsedLimit;
    
    // Get transaction slips for this seller
    const transactionsQuery = `
      SELECT 
        ts.id,
        ts.order_id,
        ts.slip_image_url,
        ts.transaction_id,
        ts.notes,
        ts.status,
        ts.created_at,
        ts.approved_at,
        o.total_amount as order_amount
      FROM transaction_slips ts
      LEFT JOIN orders o ON ts.order_id = o.id
      WHERE ts.seller_id = $1
      ORDER BY ts.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const transactionsResult = await query(transactionsQuery, [sellerId, parsedLimit, offset]);
    
    // Get totals
    const totalsQuery = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN ts.status = 'approved' THEN o.total_amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN ts.status = 'pending' THEN o.total_amount ELSE 0 END), 0) as pending_release,
        COALESCE(SUM(CASE WHEN ts.status = 'rejected' THEN o.total_amount ELSE 0 END), 0) as rejected
      FROM transaction_slips ts
      LEFT JOIN orders o ON ts.order_id = o.id
      WHERE ts.seller_id = $1
    `;
    
    const totalsResult = await query(totalsQuery, [sellerId]);
    const totals = totalsResult.rows[0];
    
    // Also get paid orders revenue (orders that are delivered/paid but not through transaction slips)
    const ordersRevenueQuery = `
      SELECT COALESCE(SUM(o.total_amount), 0) as direct_revenue
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE s.owner_id = $1 AND o.payment_status IN ('paid', 'verified') AND o.status = 'delivered'
    `;
    
    const ordersRevenueResult = await query(ordersRevenueQuery, [sellerId]);
    const directRevenue = parseFloat(ordersRevenueResult.rows[0].direct_revenue) || 0;
    
    res.status(200).json({
      success: true,
      message: 'Seller earnings retrieved successfully',
      data: {
        transactions: transactionsResult.rows.map(tx => ({
          id: tx.id,
          order_id: tx.order_id,
          amount: tx.order_amount,
          status: tx.status,
          created_at: tx.created_at,
          approved_at: tx.approved_at
        })),
        totals: {
          total_earned: directRevenue + parseFloat(totals.total_earned),
          pending_release: parseFloat(totals.pending_release),
          withdrawn: parseFloat(totals.total_earned)
        },
        pagination: {
          current_page: parseInt(page),
          total_count: parseInt(totals.total_count)
        }
      }
    });
  } catch (error) {
    console.error('Error getting seller earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Verify EasyPaisa Payment (Seller Only)
// Transitions order from awaiting_verification → paid so it can be shipped
const verifyEasypaisaPayment = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const sellerId = req.user.userId;

    // Verify the order contains this seller's products
    const orderQuery = `
      SELECT o.id, o.status, o.payment_method
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

    if (order.status !== 'awaiting_verification') {
      return res.status(400).json({
        success: false,
        message: `Only orders awaiting verification can be verified. Current status: ${order.status}`,
      });
    }

    const updateQuery = `
      UPDATE orders
      SET status = 'paid',
          payment_status = 'verified',
          seller_confirmed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, status, payment_status, updated_at
    `;

    const updatedOrderResult = await query(updateQuery, [orderId]);

    // Create notification for buyer
    await query(
      `INSERT INTO order_notifications (order_id, seller_id, notification_type, message)
       VALUES ($1, $2, 'payment_verified', $3)`,
      [orderId, sellerId, `Your EasyPaisa payment for order #${orderId} has been verified. Your order will be shipped soon.`]
    );

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Order can now be shipped.',
      data: updatedOrderResult.rows[0],
    });
  } catch (error) {
    console.error('Error verifying EasyPaisa payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update Order Status (Seller Only - cancellation only)
const updateOrderStatusBySeller = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const sellerId = req.user.userId;
    const { status } = req.body;

    if (status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Sellers can only cancel orders via this endpoint',
      });
    }

    // Verify the order contains this seller's products
    const orderQuery = `
      SELECT o.id, o.status
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
    const cancellableStatuses = ['pending', 'confirmed', 'awaiting_verification'];

    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }

    const client = await require('../config/db').pool.connect();

    try {
      await client.query('BEGIN');

      // Restore stock
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

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

module.exports = {
  getSellerOrders,
  getSellerOrderById,
  confirmOrder,
  shipOrderWithTracking,
  deliverOrder,
  getSellerNotifications,
  markNotificationAsRead,
  getMonthlyRevenue,
  getSellerEarnings,
  verifyEasypaisaPayment,
  updateOrderStatusBySeller,
};
