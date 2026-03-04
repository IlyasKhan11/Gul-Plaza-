const { query } = require('../config/db');
const {
  isValidStatusTransition,
  canVerifyPayment,
  VALIDATION_ERRORS
} = require('../helpers/orderStateValidation');
const whatsappService = require('../services/whatsappService');

// Verify EasyPaisa Payment (Seller Only)
const verifyEasyPaisaPayment = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const sellerId = req.user.userId;
    const { notes } = req.body;
    
    // Verify order contains seller's products and is awaiting verification
    const orderQuery = `
      SELECT o.id, o.status, o.payment_method, o.payment_status, o.buyer_id,
             o.seller_confirmed_at, o.seller_notes
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
    
    // Check if order is in awaiting_verification status
    if (order.status !== 'awaiting_verification') {
      return res.status(400).json({
        success: false,
        message: VALIDATION_ERRORS.PAYMENT_NOT_VERIFIABLE(order.status),
      });
    }
    
    // Check if payment method is EASYPaisa
    if (order.payment_method !== 'EASYPaisa') {
      return res.status(400).json({
        success: false,
        message: 'Only EASYPaisa payments can be verified by sellers',
      });
    }
    
    // Check if payment is already verified
    if (order.payment_status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Payment is already verified',
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
            seller_confirmed_at = CURRENT_TIMESTAMP,
            seller_notes = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, status, payment_method, payment_status, seller_confirmed_at, seller_notes, updated_at
      `;
      
      const updatedOrderResult = await client.query(updateQuery, [notes, orderId]);
      const updatedOrder = updatedOrderResult.rows[0];
      
      // Create notification for buyer
      await client.query(
        `INSERT INTO order_notifications (order_id, seller_id, notification_type, message) 
         VALUES ($1, $2, 'order_confirmed', $3)`,
        [orderId, sellerId, `Your EASYPaisa payment for order #${orderId} has been verified. Order confirmed!`]
      );
      
      await client.query('COMMIT');
      
      // Send WhatsApp confirmation to buyer
      try {
        const buyerQuery = `SELECT name, phone FROM users WHERE id = $1`;
        const buyerResult = await query(buyerQuery, [order.buyer_id]);
        
        if (buyerResult.rows.length > 0) {
          const buyer = buyerResult.rows[0];
          const orderData = { 
            id: orderId, 
            total_amount: order.total_amount, 
            payment_method: 'EASYPaisa' 
          };
          
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
        message: 'EASYPaisa payment verified successfully. Order confirmed and WhatsApp notification sent to buyer.',
        data: updatedOrder,
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error verifying EASYPaisa payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get Orders Pending Payment Verification (Seller Only)
const getPendingVerificationOrders = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    
    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);
    
    const ordersQuery = `
      SELECT DISTINCT
        o.id, o.status, o.total_amount, o.payment_status, o.payment_method,
        o.shipping_address, o.shipping_city, o.shipping_country, o.shipping_postal_code, o.shipping_phone,
        o.created_at, o.updated_at,
        u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE s.owner_id = $1 AND o.status = 'awaiting_verification' AND o.payment_method = 'EASYPaisa'
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const ordersResult = await query(ordersQuery, [sellerId, parsedLimit, offset]);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE s.owner_id = $1 AND o.status = 'awaiting_verification' AND o.payment_method = 'EASYPaisa'
    `;
    
    const countResult = await query(countQuery, [sellerId]);
    const totalOrders = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalOrders / parsedLimit);
    
    res.status(200).json({
      success: true,
      message: 'Pending verification orders retrieved successfully',
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
    console.error('Error getting pending verification orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Send Manual WhatsApp Message (Seller Only)
const sendWhatsAppMessage = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const sellerId = req.user.userId;
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }
    
    // Verify order contains seller's products
    const orderQuery = `
      SELECT o.id, o.buyer_id
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
    
    // Get buyer details
    const buyerQuery = `SELECT name, phone FROM users WHERE id = $1`;
    const buyerResult = await query(buyerQuery, [order.buyer_id]);
    
    if (buyerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Buyer not found',
      });
    }
    
    const buyer = buyerResult.rows[0];
    
    // Send WhatsApp message
    const whatsappResult = await whatsappService.sendCustomMessage(buyer.phone, message);
    
    if (whatsappResult.success) {
      // Log the manual message
      await query(
        `INSERT INTO order_notifications (order_id, seller_id, notification_type, message, whatsapp_sent, whatsapp_message_id) 
         VALUES ($1, $2, 'manual_message', $3, true, $4)`,
        [orderId, sellerId, `Manual WhatsApp sent to buyer: ${message}`, whatsappResult.messageId]
      );
      
      res.status(200).json({
        success: true,
        message: 'WhatsApp message sent to buyer successfully',
        data: {
          messageId: whatsappResult.messageId,
          recipient: buyer.phone,
          message: message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send WhatsApp message',
        error: whatsappResult.error
      });
    }
    
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  verifyEasyPaisaPayment,
  getPendingVerificationOrders,
  sendWhatsAppMessage
};
