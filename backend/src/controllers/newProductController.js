const ProductService = require('../services/productService');

// Create Product (Seller Only)
const createProduct = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const productData = req.body;
    
    const newProduct = await ProductService.createProduct(sellerId, productData);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    if (error.message === 'Seller must have a store to create products') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Category not found') {
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

// Update Product (Seller Only)
const updateProduct = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const productId = parseInt(req.params.id);
    const updateData = req.body;
    
    const updatedProduct = await ProductService.updateProduct(productId, sellerId, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    if (error.message === 'Product not found or you do not have permission to update it') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Category not found') {
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

// Delete Product (Seller Only)
const deleteProduct = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const productId = parseInt(req.params.id);
    
    await ProductService.deleteProduct(productId, sellerId);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    
    if (error.message === 'Product not found or you do not have permission to delete it') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Cannot delete product that has been ordered') {
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

// Get Single Product (Public)
const getProductById = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    const product = await ProductService.getProductById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: product
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get All Products (Public)
const getAllProducts = async (req, res) => {
  try {
    const filters = req.query;
    
    const result = await ProductService.getAllProducts(filters);
    
    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Seller's Products (Seller Only)
const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const filters = req.query;
    
    const result = await ProductService.getSellerProducts(sellerId, filters);
    
    res.status(200).json({
      success: true,
      message: 'Seller products retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error getting seller products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getAllProducts,
  getSellerProducts
};
