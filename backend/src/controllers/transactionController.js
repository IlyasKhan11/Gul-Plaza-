const { query } = require('../config/db');
const whatsappService = require('../services/whatsappService');

// Upload Transaction Slip (Buyer Only)
const uploadTransactionSlip = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const buyerId = req.user.userId;
    const { transaction_id, notes } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Transaction slip image is required',
      });
    }
    
    // Verify order belongs to buyer and is awaiting verification
    const orderQuery = `
      SELECT o.id, o.status, o.payment_method, o.buyer_id,
             oi.product_id, p.store_id, s.owner_id as seller_id
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE o.id = $1 AND o.buyer_id = $2
    `;
    
    const orderResult = await query(orderQuery, [orderId, buyerId]);
    
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
        message: 'Transaction slip can only be uploaded for orders awaiting verification',
      });
    }
    
    // Check if payment method supports direct seller transactions
    if (order.payment_method !== 'DIRECT_SELLER') {
      return res.status(400).json({
        success: false,
        message: 'Transaction slip upload is only available for DIRECT_SELLER payment method',
      });
    }
    
    // Check if transaction slip already exists
    const existingSlipQuery = `
      SELECT id FROM transaction_slips 
      WHERE order_id = $1 AND buyer_id = $2
    `;
    
    const existingSlipResult = await query(existingSlipQuery, [orderId, buyerId]);
    
    if (existingSlipResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction slip already uploaded for this order',
      });
    }
    
    // Upload image (for now, simulate upload - in production use cloud storage)
    const imageUrl = `/uploads/transaction_slips/${orderId}_${Date.now()}_${req.file.originalname}`;
    
    // Create transaction slip record
    const insertQuery = `
      INSERT INTO transaction_slips (
        order_id, buyer_id, seller_id, slip_image_url, 
        transaction_id, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, order_id, slip_image_url, transaction_id, notes, status, created_at
    `;
    
    const result = await query(insertQuery, [
      orderId, buyerId, order.seller_id, imageUrl, transaction_id, notes
    ]);
    
    const transactionSlip = result.rows[0];
    
    // Create notification for seller
    await query(
      `INSERT INTO order_notifications (order_id, seller_id, notification_type, message) 
       VALUES ($1, $2, 'transaction_uploaded', $3)`,
      [orderId, order.seller_id, `Buyer uploaded transaction slip for order #${orderId}. Please review and verify.`]
    );
    
    // Send WhatsApp notification to seller
    try {
      const sellerQuery = `SELECT name, phone FROM users WHERE id = $1`;
      const sellerResult = await query(sellerQuery, [order.seller_id]);
      
      if (sellerResult.rows.length > 0) {
        const seller = sellerResult.rows[0];
        const message = `💰 New Transaction Slip Uploaded\n\n` +
          `Order #${orderId}\n` +
          `Buyer has uploaded a transaction slip.\n` +
          `Please check your dashboard to verify the payment.`;
        
        const whatsappResult = await whatsappService.sendCustomMessage(seller.phone, message);
        
        if (whatsappResult.success) {
          // Update notification to mark WhatsApp as sent
          await query(
            `UPDATE order_notifications SET whatsapp_sent = true, whatsapp_message_id = $1 
             WHERE order_id = $2 AND seller_id = $3 AND notification_type = 'transaction_uploaded'`,
            [whatsappResult.messageId, orderId, order.seller_id]
          );
        }
      }
    } catch (whatsappError) {
      console.error('WhatsApp notification failed:', whatsappError);
      // Don't fail the request if WhatsApp fails
    }
    
    res.status(201).json({
      success: true,
      message: 'Transaction slip uploaded successfully. Seller has been notified.',
      data: transactionSlip,
    });
    
  } catch (error) {
    console.error('Error uploading transaction slip:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get Transaction Slips for Order (Buyer/Seller Only)
const getTransactionSlips = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Build WHERE conditions based on user role
    let whereClause, params;
    
    if (userRole === 'buyer') {
      whereClause = 'WHERE ts.order_id = $1 AND ts.buyer_id = $2';
      params = [orderId, userId];
    } else if (userRole === 'seller') {
      whereClause = 'WHERE ts.order_id = $1 AND ts.seller_id = $2';
      params = [orderId, userId];
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }
    
    const slipsQuery = `
      SELECT 
        ts.id, ts.order_id, ts.slip_image_url, ts.transaction_id, 
        ts.notes, ts.status, ts.approved_at, ts.rejection_reason,
        ts.created_at, ts.updated_at,
        buyer.name as buyer_name, buyer.phone as buyer_phone,
        seller.name as seller_name, seller.phone as seller_phone
      FROM transaction_slips ts
      LEFT JOIN users buyer ON ts.buyer_id = buyer.id
      LEFT JOIN users seller ON ts.seller_id = seller.id
      ${whereClause}
      ORDER BY ts.created_at DESC
    `;
    
    const result = await query(slipsQuery, params);
    
    res.status(200).json({
      success: true,
      message: 'Transaction slips retrieved successfully',
      data: result.rows,
    });
    
  } catch (error) {
    console.error('Error getting transaction slips:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Approve Transaction Slip (Seller Only)
const approveTransactionSlip = async (req, res) => {
  try {
    const slipId = parseInt(req.params.slipId);
    const sellerId = req.user.userId;
    const { action, rejection_reason } = req.body; // action: 'approve' or 'reject'
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action is required and must be either approve or reject',
      });
    }
    
    if (action === 'reject' && !rejection_reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a transaction slip',
      });
    }
    
    // Verify transaction slip belongs to seller
    const slipQuery = `
      SELECT ts.id, ts.order_id, ts.buyer_id, ts.seller_id, ts.status,
             o.total_amount, o.buyer_id as order_buyer_id
      FROM transaction_slips ts
      LEFT JOIN orders o ON ts.order_id = o.id
      WHERE ts.id = $1 AND ts.seller_id = $2
    `;
    
    const slipResult = await query(slipQuery, [slipId, sellerId]);
    
    if (slipResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction slip not found or access denied',
      });
    }
    
    const slip = slipResult.rows[0];
    
    // Check if slip is still pending
    if (slip.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Transaction slip has already been processed',
      });
    }
    
    // Start transaction
    const client = await require('../config/db').pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const approvedAt = action === 'approve' ? 'CURRENT_TIMESTAMP' : 'NULL';
      
      // Update transaction slip
      const updateSlipQuery = `
        UPDATE transaction_slips 
        SET status = $1, 
            approved_at = ${approvedAt},
            approved_by = $2,
            rejection_reason = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, status, approved_at, rejection_reason
      `;
      
      const updatedSlipResult = await client.query(updateSlipQuery, [
        newStatus, sellerId, rejection_reason || null, slipId
      ]);
      
      const updatedSlip = updatedSlipResult.rows[0];
      
      if (action === 'approve') {
        // Update order status to paid and confirmed
        const updateOrderQuery = `
          UPDATE orders 
          SET status = 'paid', 
              payment_status = 'verified',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id, status, payment_status, updated_at
        `;
        
        await client.query(updateOrderQuery, [slip.order_id]);
        
        // Create notification for buyer
        await client.query(
          `INSERT INTO order_notifications (order_id, seller_id, notification_type, message) 
           VALUES ($1, $2, 'order_confirmed', $3)`,
          [slip.order_id, sellerId, `Your transaction for order #${slip.order_id} has been approved! Order confirmed.`]
        );
        
        // Send WhatsApp confirmation to buyer
        try {
          const buyerQuery = `SELECT name, phone FROM users WHERE id = $1`;
          const buyerResult = await client.query(buyerQuery, [slip.order_buyer_id]);
          
          if (buyerResult.rows.length > 0) {
            const buyer = buyerResult.rows[0];
            const orderData = { 
              id: slip.order_id, 
              total_amount: slip.total_amount, 
              payment_method: 'DIRECT_SELLER' 
            };
            
            const whatsappResult = await whatsappService.sendOrderConfirmation(orderData, buyer);
            
            if (whatsappResult.success) {
              // Update notification to mark WhatsApp as sent
              await client.query(
                `UPDATE order_notifications SET whatsapp_sent = true, whatsapp_message_id = $1 
                 WHERE order_id = $2 AND seller_id = $3 AND notification_type = 'order_confirmed'`,
                [whatsappResult.messageId, slip.order_id, sellerId]
              );
            }
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError);
          // Don't fail the transaction if WhatsApp fails
        }
      } else {
        // Create rejection notification for buyer
        await client.query(
          `INSERT INTO order_notifications (order_id, seller_id, notification_type, message) 
           VALUES ($1, $2, 'transaction_rejected', $3)`,
          [slip.order_id, sellerId, `Your transaction for order #${slip.order_id} was rejected. Reason: ${rejection_reason}`]
        );
      }
      
      await client.query('COMMIT');
      
      const actionText = action === 'approve' ? 'approved' : 'rejected';
      res.status(200).json({
        success: true,
        message: `Transaction slip ${actionText} successfully`,
        data: updatedSlip,
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error approving transaction slip:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get Pending Transaction Slips (Seller Only)
const getPendingTransactionSlips = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    
    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);
    
    const slipsQuery = `
      SELECT 
        ts.id, ts.order_id, ts.slip_image_url, ts.transaction_id,
        ts.notes, ts.status, ts.created_at,
        o.total_amount, o.payment_method,
        buyer.name as buyer_name, buyer.phone as buyer_phone, buyer.email as buyer_email
      FROM transaction_slips ts
      LEFT JOIN orders o ON ts.order_id = o.id
      LEFT JOIN users buyer ON ts.buyer_id = buyer.id
      WHERE ts.seller_id = $1 AND ts.status = 'pending'
      ORDER BY ts.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const slipsResult = await query(slipsQuery, [sellerId, parsedLimit, offset]);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transaction_slips ts
      WHERE ts.seller_id = $1 AND ts.status = 'pending'
    `;
    
    const countResult = await query(countQuery, [sellerId]);
    const totalSlips = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalSlips / parsedLimit);
    
    res.status(200).json({
      success: true,
      message: 'Pending transaction slips retrieved successfully',
      data: {
        slips: slipsResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_slips: totalSlips,
          slips_per_page: parsedLimit,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
      },
    });
    
  } catch (error) {
    console.error('Error getting pending transaction slips:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  uploadTransactionSlip,
  getTransactionSlips,
  approveTransactionSlip,
  getPendingTransactionSlips
};
