const OrderService = require('../services/orderService');

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

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  getOrderStatistics
};
