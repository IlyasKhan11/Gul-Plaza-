const OrderService = require('../services/orderService');
const { query } = require('../config/db');
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
    const userId = req.user.userId;
    
    const order = await OrderService.createOrder(userId);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    
    if (error.message === 'Cart is empty') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Product') && error.message.includes('no longer available')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Insufficient stock')) {
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
    const { payment_method } = req.body;

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
      
      // Update order with payment method and new status
      const updateQuery = `
        UPDATE orders 
        SET payment_method = $1, 
            status = $2, 
            payment_status = 'pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, status, payment_method, payment_status, total_amount, created_at, updated_at
      `;
      
      const updatedOrderResult = await client.query(updateQuery, [
        formatStatus(payment_method),
        nextStatus,
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
