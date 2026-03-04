const { query } = require('../config/db');
const { body, param, validationResult } = require('express-validator');

// Validation rules for product creation
const createProductValidation = [
  body('title').notEmpty().isLength({ min: 1, max: 255 }).trim().escape(),
  body('description').notEmpty().isLength({ min: 1, max: 5000 }).trim().escape(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('category_id').isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
  body('is_active').optional().isBoolean(),
];

// Validation rules for product update
const updateProductValidation = [
  body('title').optional().isLength({ min: 1, max: 255 }).trim().escape(),
  body('description').optional().isLength({ min: 1, max: 5000 }).trim().escape(),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('category_id').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
  body('is_active').optional().isBoolean(),
];

// Validation rules for product ID parameter
const productIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
];

// Get all products with filtering and pagination
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category_id,
      store_id,
      min_price,
      max_price,
      search,
      is_active = true,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query;

    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100); // Max 100 products per page

    // Build WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (category_id) {
      conditions.push(`p.category_id = $${paramIndex}`);
      params.push(category_id);
      paramIndex++;
    }

    if (store_id) {
      conditions.push(`p.store_id = $${paramIndex}`);
      params.push(store_id);
      paramIndex++;
    }

    if (min_price) {
      conditions.push(`p.price >= $${paramIndex}`);
      params.push(min_price);
      paramIndex++;
    }

    if (max_price) {
      conditions.push(`p.price <= $${paramIndex}`);
      params.push(max_price);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (is_active !== 'all') {
      conditions.push(`p.is_active = $${paramIndex}`);
      params.push(is_active === 'true');
      paramIndex++;
    }

    // Validate sort column
    const allowedSortColumns = ['id', 'title', 'price', 'stock', 'created_at', 'updated_at'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build the main query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const productsQuery = `
      SELECT 
        p.id, p.title, p.description, p.price, p.stock, p.is_active, 
        p.created_at, p.updated_at,
        s.name as store_name, s.owner_id,
        u.name as seller_name, u.phone as seller_whatsapp, u.email as seller_email,
        c.name as category_name, c.slug as category_slug,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN users u ON s.owner_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parsedLimit, offset);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `;

    const countParams = params.slice(0, -2); // Remove limit and offset for count

    // Execute both queries
    const [productsResult, countResult] = await Promise.all([
      query(productsQuery, params),
      query(countQuery, countParams),
    ]);

    const totalProducts = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalProducts / parsedLimit);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: productsResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_products: totalProducts,
          products_per_page: parsedLimit,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
        filters: {
          category_id,
          store_id,
          min_price,
          max_price,
          search,
          is_active,
          sort_by: sortColumn,
          sort_order: sortDirection,
        },
      },
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get product by ID with images
const getProductById = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    const productQuery = `
      SELECT 
        p.id, p.title, p.description, p.price, p.stock, p.is_active, 
        p.created_at, p.updated_at,
        s.id as store_id, s.name as store_name, s.description as store_description,
        c.id as category_id, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;
    
    const productResult = await query(productQuery, [productId]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    
    // Get product images
    const imagesQuery = `
      SELECT id, image_url, created_at
      FROM product_images
      WHERE product_id = $1
      ORDER BY id ASC
    `;
    
    const imagesResult = await query(imagesQuery, [productId]);
    
    const product = productResult.rows[0];
    product.images = imagesResult.rows;
    
    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error getting product by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Create new product (Seller only)
const createProduct = async (req, res) => {
  try {
    console.log('Product controller: createProduct called');
    const sellerId = req.user.userId;
    const { title, description, price, stock, category_id } = req.body;
    
    // Simple test response
    res.status(201).json({
      success: true,
      message: 'Product creation test successful',
      data: { sellerId, title, price, stock, category_id }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update product (Seller only)
const updateProduct = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }
    
    const sellerId = req.user.userId;
    const productId = parseInt(req.params.id);
    const { title, description, price, stock, category_id, is_active } = req.body;
    
    // Check if product exists and belongs to seller
    const productCheckQuery = `
      SELECT p.id, p.store_id
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.id = $1 AND s.owner_id = $2
    `;
    
    const productCheckResult = await query(productCheckQuery, [productId, sellerId]);
    
    if (productCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to update it',
      });
    }
    
    // Check if category_id is provided and exists
    if (category_id) {
      const categoryResult = await query(
        'SELECT id FROM categories WHERE id = $1',
        [category_id]
      );
      
      if (categoryResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Category not found',
        });
      }
    }
    
    // Update product
    const updateQuery = `
      UPDATE products
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        stock = COALESCE($4, stock),
        category_id = COALESCE($5, category_id),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, title, description, price, stock, is_active, created_at, updated_at
    `;
    
    const updatedProductResult = await query(updateQuery, [
      title,
      description,
      price,
      stock,
      category_id,
      is_active,
      productId
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProductResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete product (Seller only)
const deleteProduct = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const productId = parseInt(req.params.id);
    
    // Check if product exists and belongs to seller
    const productCheckQuery = `
      SELECT p.id
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.id = $1 AND s.owner_id = $2
    `;
    
    const productCheckResult = await query(productCheckQuery, [productId, sellerId]);
    
    if (productCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to delete it',
      });
    }
    
    // Check if product has orders (prevent deletion if it has been ordered)
    const orderCheckQuery = `
      SELECT COUNT(*) as count
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = $1 AND o.status NOT IN ('cancelled')
    `;
    
    const orderCheckResult = await query(orderCheckQuery, [productId]);
    
    if (parseInt(orderCheckResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product that has been ordered',
      });
    }
    
    // Delete product (this will also delete product images due to CASCADE)
    await query('DELETE FROM products WHERE id = $1', [productId]);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get seller's products
const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { page = 1, limit = 20, is_active = 'all', search } = req.query;
    
    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);
    
    // Build WHERE conditions
    const conditions = [`s.owner_id = $1`];
    const params = [sellerId];
    let paramIndex = 2;
    
    if (is_active !== 'all') {
      conditions.push(`p.is_active = $${paramIndex}`);
      params.push(is_active === 'true');
      paramIndex++;
    }
    
    if (search) {
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const productsQuery = `
      SELECT 
        p.id, p.title, p.description, p.price, p.stock, p.is_active, 
        p.created_at, p.updated_at,
        c.name as category_name, c.slug as category_slug,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parsedLimit, offset);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      ${whereClause}
    `;
    
    const countParams = params.slice(0, -2);
    
    const [productsResult, countResult] = await Promise.all([
      query(productsQuery, params),
      query(countQuery, countParams),
    ]);
    
    const totalProducts = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalProducts / parsedLimit);
    
    res.status(200).json({
      success: true,
      message: 'Seller products retrieved successfully',
      data: {
        products: productsResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_products: totalProducts,
          products_per_page: parsedLimit,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error getting seller products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
  createProductValidation,
  updateProductValidation,
  productIdValidation,
};
