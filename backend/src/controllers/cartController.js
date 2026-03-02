const CartService = require('../services/cartService');

// Add to Cart (Buyer Only)
const addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id, quantity } = req.body;
    
    const result = await CartService.addToCart(userId, product_id, quantity);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Product is not available') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Insufficient stock available' || 
        error.message === 'Maximum quantity limit exceeded (999)' ||
        error.message === 'Insufficient stock available for requested quantity') {
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

// Get My Cart (Buyer Only)
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const cartData = await CartService.getCart(userId);
    
    res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: cartData
    });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update Cart Item (Buyer Only)
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = parseInt(req.params.productId);
    const { quantity } = req.body;
    
    const result = await CartService.updateCartItem(userId, productId, quantity);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Product is not available' ||
        error.message === 'Insufficient stock available') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Cart item not found') {
      return res.status(404).json({
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

// Remove From Cart (Buyer Only)
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = parseInt(req.params.productId);
    
    const result = await CartService.removeFromCart(userId, productId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    
    if (error.message === 'Cart item not found') {
      return res.status(404).json({
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

// Clear Cart (Buyer Only) - Additional utility endpoint
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await CartService.clearCart(userId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Cart Summary (Buyer Only) - For checkout preview
const getCartSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const summary = await CartService.getCartSummary(userId);
    
    res.status(200).json({
      success: true,
      message: 'Cart summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    console.error('Error getting cart summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary
};
