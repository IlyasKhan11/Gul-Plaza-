const OrderService = require('../services/orderService');
const { query } = require('../config/db');
const whatsappService = require('../services/whatsappService');
const notificationService = require('../services/notificationService');
const {
  isValidStatusTransition,
  getStatusAfterPaymentSelection,
  isValidPaymentMethod,
  formatStatus,
  VALIDATION_ERRORS
} = require('../helpers/orderStateValidation');

// Create Order (CRITICAL - Buyer Only)
const createOrder = async (req, res) => {
  try {
    console.log('Order controller: createOrder called');
    const userId = req.user.userId;
    console.log('Order creation for userId:', userId);
    const { 
      items, 
      shipping_address, 
      shipping_city, 
      shipping_country, 
      shipping_postal_code, 
      shipping_phone,
      shipping_full_name
    } = req.body;
    
    // Validate required shipping information
    if (!shipping_address || !shipping_city || !shipping_country || !shipping_postal_code || !shipping_phone) {
      return res.status(400).json({
        success: false,
        message: 'All shipping information is required'
      });
    }
    
    // Get cart items for the user
    const cartQuery = `
      SELECT c.product_id, c.quantity, p.price, p.title, p.stock, p.is_active, p.store_id, s.owner_id as seller_id
      FROM cart c
      JOIN products p ON c.product_id = p.id
      JOIN stores s ON p.store_id = s.id
      WHERE c.user_id = $1 AND p.is_active = true
    `;
    
    const cartResult = await query(cartQuery, [userId]);
    console.log('Cart query result for userId', userId, ':', cartResult.rows);
    
    if (cartResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty or products are not available'
      });
    }
    
    // Check stock availability
    for (const item of cartResult.rows) {
      if (item.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${item.title}`
        });
      }
    }
    
    // Calculate total amount
    const totalAmount = cartResult.rows.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);
    
    // Collect unique sellers for notifications after commit
    const sellerMap = new Map(); // sellerId -> { title, quantity }
    for (const item of cartResult.rows) {
      if (!sellerMap.has(item.seller_id)) {
        sellerMap.set(item.seller_id, []);
      }
      sellerMap.get(item.seller_id).push({ title: item.title, quantity: item.quantity });
    }

    // Start transaction
    const client = await require('../config/db').pool.connect();

    try {
      await client.query('BEGIN');

      // Create order with shipping information
      const createOrderQuery = `
        INSERT INTO orders (
          buyer_id, user_id, total_amount, payment_status, 
          shipping_address, shipping_city, shipping_country, 
          shipping_postal_code, shipping_phone, shipping_full_name
        ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9)
        RETURNING id, status, total_amount, payment_status, created_at, updated_at
      `;
      
      const newOrderResult = await client.query(createOrderQuery, [
        userId, userId, totalAmount,
        shipping_address, shipping_city, shipping_country, 
        shipping_postal_code, shipping_phone, shipping_full_name || null
      ]);
      
      const newOrder = newOrderResult.rows[0];
      
      // Create order items and update product stock
      for (const item of cartResult.rows) {
        // Create order item
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
          [newOrder.id, item.product_id, item.quantity, item.price]
        );
        
        // Update product stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
        
        // Create notification for seller
        await client.query(
          `INSERT INTO order_notifications (order_id, seller_id, notification_type, message) 
           VALUES ($1, $2, 'new_order', $3)`,
          [newOrder.id, item.seller_id, `New order #${newOrder.id} received for product: ${item.title}`]
        );

        // Send WhatsApp notification to seller
        try {
          const sellerQuery = `SELECT name, phone FROM users WHERE id = $1`;
          const sellerResult = await client.query(sellerQuery, [item.seller_id]);
          
          if (sellerResult.rows.length > 0) {
            const seller = sellerResult.rows[0];
            const orderData = { 
              id: newOrder.id, 
              total_amount: totalAmount, 
              payment_method: 'pending',
              buyer_name: req.user.name 
            };
            
            const items = [{ title: item.title, quantity: item.quantity }];
            const whatsappResult = await whatsappService.sendNewOrderToSeller(orderData, seller, items);
            
            if (whatsappResult.success) {
              // Update notification to mark WhatsApp as sent
              await client.query(
                `UPDATE order_notifications SET whatsapp_sent = true, whatsapp_message_id = $1 
                 WHERE order_id = $2 AND seller_id = $3 AND notification_type = 'new_order'`,
                [whatsappResult.messageId, newOrder.id, item.seller_id]
              );
            }
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError);
          // Don't fail the transaction if WhatsApp fails
        }
      }
      
      // Clear cart after successful order creation
      await client.query('DELETE FROM cart WHERE user_id = $1', [userId]);
      
      await client.query('COMMIT');

      // Notify each seller via notifications table + SSE
      for (const [sellerId, items] of sellerMap) {
        const itemsSummary = items.map(i => `${i.title} (x${i.quantity})`).join(', ');
        notificationService.saveNotification(
          sellerId,
          notificationService.NotificationEvents.NEW_ORDER,
          'New Order Received',
          `Order #${newOrder.id} placed by ${req.user.name}: ${itemsSummary}`,
          `/seller/orders`
        ).catch(() => {});
      }

      res.status(201).json({
        success: true,
        message: 'Order created successfully. Please select a payment method.',
        data: newOrder
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
      message: 'Internal server error'
    });
  }
};

// Get My Orders (Buyer Only)

// Get My Orders (Buyer Only)
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const filters = req.query;
    
    const result = await OrderService.getUserOrders(userId, filters);
    
    res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error getting user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Order by ID (Buyer Only - Own Orders)
const getOrderById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = parseInt(req.params.orderId);
    
    const order = await OrderService.getOrderById(orderId, userId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: order
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get All Orders (Admin Only)
const getAllOrders = async (req, res) => {
  try {
    const filters = req.query;
    
    const result = await OrderService.getAllOrders(filters);
    
    res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error getting all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Order by ID (Admin Only)
const getAdminOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    const order = await OrderService.getOrderById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: order
    });
  } catch (error) {
    console.error('Error getting admin order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update Order Status (Admin Only)
const updateOrderStatus = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { status, notes } = req.body;
    
    const updatedOrder = await OrderService.updateOrderStatus(orderId, status, notes);
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Order Statistics (Admin Only)
const getOrderStatistics = async (req, res) => {
  try {
    const statistics = await OrderService.getOrderStatistics();
    
    res.status(200).json({
      success: true,
      message: 'Order statistics retrieved successfully',
      data: statistics
    });
  } catch (error) {
    console.error('Error getting order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Select Payment Method (Buyer Only)
const selectPaymentMethod = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const buyerId = req.user.userId;
    const { payment_method, transaction_id } = req.body;
    let screenshotUrl = null;
    // If screenshot is uploaded, save file and get URL
    if (req.file) {
      // Save file to /uploads/payments or similar
      const fs = require('fs');
      const path = require('path');
      const uploadDir = path.join(__dirname, '../../uploads/payments');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filename = `order_${orderId}_${Date.now()}_${req.file.originalname}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      screenshotUrl = `/uploads/payments/${filename}`;
    }

    // Validate payment method
    if (!payment_method) {
      return res.status(400).json({
        success: false,
        message: VALIDATION_ERRORS.PAYMENT_METHOD_REQUIRED
      });
    }

    if (!isValidPaymentMethod(payment_method)) {
      return res.status(400).json({
        success: false,
        message: VALIDATION_ERRORS.INVALID_PAYMENT_METHOD(payment_method)
      });
    }

    // Get order and verify ownership
    const orderQuery = `
      SELECT id, status, buyer_id, payment_method, payment_status
      FROM orders
      WHERE id = $1
    `;
    
    const orderResult = await query(orderQuery, [orderId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Verify order ownership
    if (order.buyer_id !== buyerId) {
      return res.status(403).json({
        success: false,
        message: VALIDATION_ERRORS.ORDER_OWNERSHIP_REQUIRED
      });
    }

    // Check if order is in pending status
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: VALIDATION_ERRORS.INVALID_TRANSITION(order.status, 'Payment selection only allowed for PENDING orders')
      });
    }

    // Check if payment method is already selected
    if (order.payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Payment method already selected for this order'
      });
    }

    // Determine next status based on payment method
    const nextStatus = getStatusAfterPaymentSelection(payment_method);
    
    // Start transaction
    const client = await require('../config/db').pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update order with payment method, transaction_id, screenshot, and new status
      const updateQuery = `
        UPDATE orders 
        SET payment_method = $1, 
            status = $2, 
            payment_status = 'pending',
            transaction_id = $3,
            payment_screenshot = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, status, payment_method, payment_status, transaction_id, payment_screenshot, total_amount, created_at, updated_at
      `;
    
      const updatedOrderResult = await client.query(updateQuery, [
        formatStatus(payment_method),
        nextStatus,
        transaction_id || null,
        screenshotUrl,
        orderId
      ]);
      
      await client.query('COMMIT');
      
      const updatedOrder = updatedOrderResult.rows[0];
      
      res.status(200).json({
        success: true,
        message: `Payment method selected successfully. Order status updated to ${nextStatus}`,
        data: updatedOrder
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error selecting payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify Payment (Admin Only)
const verifyPayment = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const adminId = req.user.userId;

    // Get order
    const orderQuery = `
      SELECT id, status, payment_method, payment_status, buyer_id
      FROM orders
      WHERE id = $1
    `;
    
    const orderResult = await query(orderQuery, [orderId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Check if order is in awaiting_verification status
    if (order.status !== 'awaiting_verification') {
      return res.status(400).json({
        success: false,
        message: VALIDATION_ERRORS.PAYMENT_NOT_VERIFIABLE(order.status)
      });
    }

    // Start transaction
    const client = await require('../config/db').pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update order status and payment status
      const updateQuery = `
        UPDATE orders 
        SET status = 'paid', 
            payment_status = 'verified',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, status, payment_method, payment_status, total_amount, created_at, updated_at
      `;
      
      const updatedOrderResult = await client.query(updateQuery, [orderId]);
      
      await client.query('COMMIT');
      
      const updatedOrder = updatedOrderResult.rows[0];
      
      res.status(200).json({
        success: true,
        message: 'Payment verified successfully. Order status updated to PAID',
        data: updatedOrder
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Ship Order (Admin Only)
const shipOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // Get order
    const orderQuery = `
      SELECT id, status, payment_method, payment_status
      FROM orders
      WHERE id = $1
    `;
    
    const orderResult = await query(orderQuery, [orderId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Check if order can be shipped (PAID or CONFIRMED)
    if (order.status !== 'PAID' && order.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: VALIDATION_ERRORS.ORDER_NOT_SHIPPABLE(order.status)
      });
    }

    // Update order status to SHIPPED
    const updateQuery = `
      UPDATE orders 
      SET status = 'SHIPPED', 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, status, payment_method, payment_status, total_amount, created_at, updated_at
    `;
    
    const updatedOrderResult = await query(updateQuery, [orderId]);
    const updatedOrder = updatedOrderResult.rows[0];
    
    res.status(200).json({
      success: true,
      message: 'Order shipped successfully',
      data: updatedOrder
    });
    
  } catch (error) {
    console.error('Error shipping order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  getOrderStatistics,
  selectPaymentMethod,
  verifyPayment,
  shipOrder
};
