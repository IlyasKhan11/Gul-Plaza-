const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import controllers and validation
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getAllProducts,
  getSellerProducts,
  uploadProductImage,
  createProductValidation,
  updateProductValidation,
  productIdValidation
} = require('../controllers/productController');

// Multer setup for product image uploads
const productUploadDir = path.join(__dirname, '../../../uploads/products');
if (!fs.existsSync(productUploadDir)) fs.mkdirSync(productUploadDir, { recursive: true });

const productImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, productUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const productImageUpload = multer({
  storage: productImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
  },
});

const { handleValidationErrors } = require('../middleware/validationMiddleware');

const { authenticateToken } = require('../middleware/authMiddleware');
const { requireSeller } = require('../middleware/roleMiddleware');

const router = express.Router();

// Rate limiting disabled for development
// const productLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many product requests, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const sellerProductLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 30, // Limit each IP to 30 seller requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many seller product operations, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Product routes info endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Product API endpoints',
    endpoints: {
      'GET /api/products': 'Get all products with filtering (public)',
      'GET /api/products/:id': 'Get product by ID (public)',
      'POST /api/products': 'Create new product (seller only)',
      'PUT /api/products/:id': 'Update product (seller only)',
      'DELETE /api/products/:id': 'Delete product (seller only)',
      'GET /api/products/seller/my-products': 'Get seller\'s products (seller only)',
    },
    note: 'Create, update, delete, and my-products endpoints require seller role',
  });
});

/**
 * @route   GET /api/products
 * @desc    Get all products with filtering and pagination
 * @access  Public
 */
router.get('/', getAllProducts);

/**
 * @route   GET /api/products/seller/my-products
 * @desc    Get seller's products
 * @access  Private (Seller only)
 */
router.get('/seller/my-products', authenticateToken, requireSeller, getSellerProducts);

/**
 * @route   POST /api/products/upload-image
 * @desc    Upload a product image file
 * @access  Private (Seller only)
 */
router.post('/upload-image', authenticateToken, requireSeller, productImageUpload.single('image'), uploadProductImage);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID with images
 * @access  Public
 */
router.get('/:id', productIdValidation, handleValidationErrors, getProductById);

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (Seller only)
 */
router.post('/', authenticateToken, requireSeller, createProductValidation, handleValidationErrors, createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Seller only)
 */
router.put('/:id', authenticateToken, requireSeller, productIdValidation, handleValidationErrors, updateProductValidation, handleValidationErrors, updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product
 * @access  Private (Seller only)
 */
router.delete('/:id', authenticateToken, requireSeller, productIdValidation, handleValidationErrors, deleteProduct);

module.exports = router;
