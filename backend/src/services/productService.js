const { query } = require('../config/db');
const { getCache, setCache, deleteCache } = require('../config/redis');

class ProductService {
  // Create new product
  static async createProduct(sellerId, productData) {
    const { title, description, price, category_id, stock, images } = productData;
    
    // Start transaction
    const client = await query('BEGIN');
    
    try {
      // Check if seller has a store
      const storeQuery = 'SELECT id FROM stores WHERE owner_id = $1';
      const storeResult = await query(storeQuery, [sellerId]);
      
      if (storeResult.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('Seller must have a store to create products');
      }
      
      const storeId = storeResult.rows[0].id;
      
      // Check if category exists
      const categoryQuery = 'SELECT id FROM categories WHERE id = $1';
      const categoryResult = await query(categoryQuery, [category_id]);
      
      if (categoryResult.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('Category not found');
      }
      
      // Create product
      const createProductQuery = `
        INSERT INTO products (store_id, category_id, title, description, price, stock, is_deleted)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title, description, price, stock, is_active, created_at, updated_at
      `;
      
      const productResult = await query(createProductQuery, [
        storeId,
        category_id,
        title,
        description,
        price,
        stock,
        false
      ]);
      
      const newProduct = productResult.rows[0];
      
      // Add images if provided
      if (images && images.length > 0) {
        const imageQuery = `
          INSERT INTO product_images (product_id, image_url)
          VALUES ($1, $2)
        `;
        
        for (const imageUrl of images) {
          await query(imageQuery, [newProduct.id, imageUrl]);
        }
      }
      
      await query('COMMIT');
      
      // Invalidate cache
      await this.invalidateProductCache();
      
      return newProduct;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
  
  // Update product (seller can only update their own)
  static async updateProduct(productId, sellerId, updateData) {
    const { title, description, price, category_id, stock, images } = updateData;
    
    // Start transaction
    await query('BEGIN');
    
    try {
      // Check if product exists and belongs to seller
      const productCheckQuery = `
        SELECT p.id, p.store_id
        FROM products p
        LEFT JOIN stores s ON p.store_id = s.id
        WHERE p.id = $1 AND s.owner_id = $2 AND p.is_deleted = false
      `;
      
      const productCheckResult = await query(productCheckQuery, [productId, sellerId]);
      
      if (productCheckResult.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('Product not found or you do not have permission to update it');
      }
      
      // Check if category_id is provided and exists
      if (category_id) {
        const categoryQuery = 'SELECT id FROM categories WHERE id = $1';
        const categoryResult = await query(categoryQuery, [category_id]);
        
        if (categoryResult.rows.length === 0) {
          await query('ROLLBACK');
          throw new Error('Category not found');
        }
      }
      
      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        updateValues.push(title);
        paramIndex++;
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(description);
        paramIndex++;
      }
      
      if (price !== undefined) {
        updateFields.push(`price = $${paramIndex}`);
        updateValues.push(price);
        paramIndex++;
      }
      
      if (stock !== undefined) {
        updateFields.push(`stock = $${paramIndex}`);
        updateValues.push(stock);
        paramIndex++;
      }
      
      if (category_id !== undefined) {
        updateFields.push(`category_id = $${paramIndex}`);
        updateValues.push(category_id);
        paramIndex++;
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(productId);
      
      const updateQuery = `
        UPDATE products
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, title, description, price, stock, is_active, created_at, updated_at
      `;
      
      const updateResult = await query(updateQuery, updateValues);
      const updatedProduct = updateResult.rows[0];
      
      // Update images if provided
      if (images !== undefined) {
        // Delete existing images
        await query('DELETE FROM product_images WHERE product_id = $1', [productId]);
        
        // Add new images
        if (images.length > 0) {
          const imageQuery = `
            INSERT INTO product_images (product_id, image_url)
            VALUES ($1, $2)
          `;
          
          for (const imageUrl of images) {
            await query(imageQuery, [productId, imageUrl]);
          }
        }
      }
      
      await query('COMMIT');
      
      // Invalidate cache
      await this.invalidateProductCache();
      await deleteCache(`product:${productId}`);
      
      return updatedProduct;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
  
  // Delete product (soft delete, seller can only delete their own)
  static async deleteProduct(productId, sellerId) {
    try {
      // Check if product exists and belongs to seller
      const productCheckQuery = `
        SELECT p.id
        FROM products p
        LEFT JOIN stores s ON p.store_id = s.id
        WHERE p.id = $1 AND s.owner_id = $2 AND p.is_deleted = false
      `;
      
      const productCheckResult = await query(productCheckQuery, [productId, sellerId]);
      
      if (productCheckResult.rows.length === 0) {
        throw new Error('Product not found or you do not have permission to delete it');
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
        throw new Error('Cannot delete product that has been ordered');
      }
      
      // Soft delete product
      const deleteQuery = `
        UPDATE products
        SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await query(deleteQuery, [productId]);
      
      // Invalidate cache
      await this.invalidateProductCache();
      await deleteCache(`product:${productId}`);
      
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  // Get single product by ID (public)
  static async getProductById(productId) {
    try {
      // Check cache first
      const cacheKey = `product:${productId}`;
      const cachedProduct = await getCache(cacheKey);
      
      if (cachedProduct) {
        return JSON.parse(cachedProduct);
      }
      
      const productQuery = `
        SELECT 
          p.id, p.title, p.description, p.price, p.stock, p.is_active, 
          p.created_at, p.updated_at,
          s.id as seller_id, s.name as seller_name, s.email as seller_email,
          c.id as category_id, c.name as category_name
        FROM products p
        LEFT JOIN stores s ON p.store_id = s.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1 AND p.is_deleted = false
      `;
      
      const productResult = await query(productQuery, [productId]);
      
      if (productResult.rows.length === 0) {
        return null;
      }
      
      const product = productResult.rows[0];
      
      // Get product images
      const imagesQuery = `
        SELECT image_url
        FROM product_images
        WHERE product_id = $1
        ORDER BY id ASC
      `;
      
      const imagesResult = await query(imagesQuery, [productId]);
      product.images = imagesResult.rows.map(row => row.image_url);
      
      // Cache the result for 1 hour
      await setCache(cacheKey, JSON.stringify(product), 3600);
      
      return product;
    } catch (error) {
      throw error;
    }
  }
  
  // Get all products with filtering and pagination (public)
  static async getAllProducts(filters) {
    try {
      const {
        page = 1,
        limit = 20,
        category_id,
        search,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = filters;
      
      // Create cache key
      const cacheKey = `products:${JSON.stringify(filters)}`;
      const cachedProducts = await getCache(cacheKey);
      
      if (cachedProducts) {
        return JSON.parse(cachedProducts);
      }
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const parsedLimit = Math.min(parseInt(limit), 100);
      
      // Build WHERE conditions
      const conditions = ['p.is_deleted = false'];
      const params = [];
      let paramIndex = 1;
      
      if (category_id) {
        conditions.push(`p.category_id = $${paramIndex}`);
        params.push(category_id);
        paramIndex++;
      }
      
      if (search) {
        conditions.push(`p.title ILIKE $${paramIndex}`);
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      // Validate sort column
      const allowedSortColumns = ['title', 'price', 'created_at', 'stock'];
      const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      
      // Build the main query
      const whereClause = conditions.join(' AND ');
      
      const productsQuery = `
        SELECT 
          p.id, p.title, p.description, p.price, p.stock, p.is_active, 
          p.created_at, p.updated_at,
          s.name as seller_name,
          c.name as category_name,
          (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as primary_image
        FROM products p
        LEFT JOIN stores s ON p.store_id = s.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ${whereClause}
        ORDER BY p.${sortColumn} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(parsedLimit, offset);
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        WHERE ${whereClause}
      `;
      
      const countParams = params.slice(0, -2); // Remove limit and offset for count
      
      // Execute both queries
      const [productsResult, countResult] = await Promise.all([
        query(productsQuery, params),
        query(countQuery, countParams),
      ]);
      
      const totalProducts = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalProducts / parsedLimit);
      
      const result = {
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
          search,
          sort_by: sortColumn,
          sort_order: sortDirection.toLowerCase(),
        },
      };
      
      // Cache the result for 30 minutes
      await setCache(cacheKey, JSON.stringify(result), 1800);
      
      return result;
    } catch (error) {
      throw error;
    }
  }
  
  // Get seller's products
  static async getSellerProducts(sellerId, filters) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = filters;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const parsedLimit = Math.min(parseInt(limit), 100);
      
      // Build WHERE conditions
      const conditions = ['p.is_deleted = false', 's.owner_id = $1'];
      const params = [sellerId];
      let paramIndex = 2;
      
      if (search) {
        conditions.push(`p.title ILIKE $${paramIndex}`);
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      // Validate sort column
      const allowedSortColumns = ['title', 'price', 'created_at', 'stock'];
      const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      
      const whereClause = conditions.join(' AND ');
      
      const productsQuery = `
        SELECT 
          p.id, p.title, p.description, p.price, p.stock, p.is_active, 
          p.created_at, p.updated_at,
          c.name as category_name,
          (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as primary_image
        FROM products p
        LEFT JOIN stores s ON p.store_id = s.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ${whereClause}
        ORDER BY p.${sortColumn} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(parsedLimit, offset);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        LEFT JOIN stores s ON p.store_id = s.id
        WHERE ${whereClause}
      `;
      
      const countParams = params.slice(0, -2);
      
      const [productsResult, countResult] = await Promise.all([
        query(productsQuery, params),
        query(countQuery, countParams),
      ]);
      
      const totalProducts = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalProducts / parsedLimit);
      
      return {
        products: productsResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_products: totalProducts,
          products_per_page: parsedLimit,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Invalidate product cache
  static async invalidateProductCache() {
    try {
      // This is a simple approach - in production, you might want to use pattern matching
      // to delete all keys matching a certain pattern
      await deleteCache('products:*');
    } catch (error) {
      console.error('Error invalidating product cache:', error);
    }
  }
}

module.exports = ProductService;
