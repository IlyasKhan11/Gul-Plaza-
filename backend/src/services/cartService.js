const { query } = require('../config/db');
const { getCache, setCache, deleteCache } = require('../config/redis');

class CartService {
  // Add product to cart (buyer only)
  static async addToCart(userId, productId, quantity) {
    try {
      // Start transaction for cart operations
      await query('BEGIN');
      
      // Verify product exists and is active
      const productCheckQuery = `
        SELECT p.id, p.title, p.price, p.stock, p.is_active, p.is_deleted
        FROM products p
        WHERE p.id = $1
      `;
      
      const productResult = await query(productCheckQuery, [productId]);
      
      if (productResult.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('Product not found');
      }
      
      const product = productResult.rows[0];
      
      if (product.is_deleted || !product.is_active) {
        await query('ROLLBACK');
        throw new Error('Product is not available');
      }
      
      if (product.stock < quantity) {
        await query('ROLLBACK');
        throw new Error('Insufficient stock available');
      }
      
      // Check if product already exists in cart
      const existingItemQuery = `
        SELECT id, quantity
        FROM cart_items
        WHERE user_id = $1 AND product_id = $2
      `;
      
      const existingItemResult = await query(existingItemQuery, [userId, productId]);
      
      if (existingItemResult.rows.length > 0) {
        // Update existing cart item
        const existingQuantity = existingItemResult.rows[0].quantity;
        const newQuantity = existingQuantity + quantity;
        
        if (newQuantity > 999) {
          await query('ROLLBACK');
          throw new Error('Maximum quantity limit exceeded (999)');
        }
        
        if (product.stock < newQuantity) {
          await query('ROLLBACK');
          throw new Error('Insufficient stock available for requested quantity');
        }
        
        const updateQuery = `
          UPDATE cart_items
          SET quantity = $1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2 AND product_id = $3
          RETURNING id, quantity, updated_at
        `;
        
        await query(updateQuery, [newQuantity, userId, productId]);
      } else {
        // Add new cart item
        const insertQuery = `
          INSERT INTO cart_items (user_id, product_id, quantity)
          VALUES ($1, $2, $3)
          RETURNING id, quantity, created_at
        `;
        
        await query(insertQuery, [userId, productId, quantity]);
      }
      
      await query('COMMIT');
      
      // Invalidate cart cache
      await this.invalidateCartCache(userId);
      
      return { message: 'Product added to cart successfully' };
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
  
  // Get user's cart with product details
  static async getCart(userId) {
    try {
      // Check cache first
      const cacheKey = `cart:${userId}`;
      const cachedCart = await getCache(cacheKey);
      
      if (cachedCart) {
        return JSON.parse(cachedCart);
      }
      
      const cartQuery = `
        SELECT 
          ci.id as cart_item_id,
          ci.quantity,
          ci.created_at as added_at,
          p.id as product_id,
          p.title,
          p.price,
          p.stock as available_stock,
          p.is_active,
          (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as product_image
        FROM cart_items ci
        INNER JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1 AND p.is_deleted = false
        ORDER BY ci.created_at DESC
      `;
      
      const cartResult = await query(cartQuery, [userId]);
      
      // Calculate subtotal and check stock availability
      let subtotal = 0;
      const items = [];
      
      for (const item of cartResult.rows) {
        const itemTotal = parseFloat(item.price) * item.quantity;
        subtotal += itemTotal;
        
        items.push({
          cart_item_id: item.cart_item_id,
          product_id: item.product_id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          available_stock: item.available_stock,
          is_active: item.is_active,
          product_image: item.product_image,
          item_total: itemTotal.toFixed(2),
          added_at: item.added_at,
          in_stock: item.available_stock >= item.quantity && item.is_active
        });
      }
      
      const cartData = {
        items,
        summary: {
          total_items: items.length,
          subtotal: subtotal.toFixed(2),
          currency: 'USD'
        }
      };
      
      // Cache the result for 15 minutes
      await setCache(cacheKey, JSON.stringify(cartData), 900);
      
      return cartData;
    } catch (error) {
      throw error;
    }
  }
  
  // Update cart item quantity
  static async updateCartItem(userId, productId, quantity) {
    try {
      // Start transaction
      await query('BEGIN');
      
      // Verify product exists and has sufficient stock
      const productCheckQuery = `
        SELECT id, stock, is_active, is_deleted
        FROM products
        WHERE id = $1
      `;
      
      const productResult = await query(productCheckQuery, [productId]);
      
      if (productResult.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('Product not found');
      }
      
      const product = productResult.rows[0];
      
      if (product.is_deleted || !product.is_active) {
        await query('ROLLBACK');
        throw new Error('Product is not available');
      }
      
      if (product.stock < quantity) {
        await query('ROLLBACK');
        throw new Error('Insufficient stock available');
      }
      
      // Update cart item
      const updateQuery = `
        UPDATE cart_items
        SET quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2 AND product_id = $3
        RETURNING id, quantity, updated_at
      `;
      
      const updateResult = await query(updateQuery, [quantity, userId, productId]);
      
      if (updateResult.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('Cart item not found');
      }
      
      await query('COMMIT');
      
      // Invalidate cart cache
      await this.invalidateCartCache(userId);
      
      return { message: 'Cart item updated successfully' };
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
  
  // Remove item from cart
  static async removeFromCart(userId, productId) {
    try {
      const deleteQuery = `
        DELETE FROM cart_items
        WHERE user_id = $1 AND product_id = $2
        RETURNING id
      `;
      
      const deleteResult = await query(deleteQuery, [userId, productId]);
      
      if (deleteResult.rows.length === 0) {
        throw new Error('Cart item not found');
      }
      
      // Invalidate cart cache
      await this.invalidateCartCache(userId);
      
      return { message: 'Item removed from cart successfully' };
    } catch (error) {
      throw error;
    }
  }
  
  // Clear entire cart (used after order creation)
  static async clearCart(userId) {
    try {
      const deleteQuery = `
        DELETE FROM cart_items
        WHERE user_id = $1
      `;
      
      await query(deleteQuery, [userId]);
      
      // Invalidate cart cache
      await this.invalidateCartCache(userId);
      
      return { message: 'Cart cleared successfully' };
    } catch (error) {
      throw error;
    }
  }
  
  // Get cart items for order creation (with row locking)
  static async getCartItemsForOrder(userId) {
    try {
      const cartItemsQuery = `
        SELECT 
          ci.product_id,
          ci.quantity,
          p.price,
          p.stock,
          p.title,
          p.is_active
        FROM cart_items ci
        INNER JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1 AND p.is_deleted = false
        FOR UPDATE OF ci, p
      `;
      
      const cartItemsResult = await query(cartItemsQuery, [userId]);
      
      if (cartItemsResult.rows.length === 0) {
        throw new Error('Cart is empty');
      }
      
      // Validate all items are available and have sufficient stock
      for (const item of cartItemsResult.rows) {
        if (!item.is_active) {
          throw new Error(`Product "${item.title}" is no longer available`);
        }
        
        if (item.stock < item.quantity) {
          throw new Error(`Insufficient stock for product "${item.title}". Available: ${item.stock}, Requested: ${item.quantity}`);
        }
      }
      
      return cartItemsResult.rows;
    } catch (error) {
      throw error;
    }
  }
  
  // Get cart summary for checkout
  static async getCartSummary(userId) {
    try {
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_items,
          SUM(ci.quantity * p.price) as subtotal
        FROM cart_items ci
        INNER JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1 AND p.is_deleted = false AND p.is_active = true
      `;
      
      const summaryResult = await query(summaryQuery, [userId]);
      
      const summary = summaryResult.rows[0];
      
      return {
        total_items: parseInt(summary.total_items),
        subtotal: parseFloat(summary.subtotal || 0).toFixed(2),
        currency: 'USD'
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Invalidate cart cache
  static async invalidateCartCache(userId) {
    try {
      await deleteCache(`cart:${userId}`);
    } catch (error) {
      console.error('Error invalidating cart cache:', error);
    }
  }
}

module.exports = CartService;
