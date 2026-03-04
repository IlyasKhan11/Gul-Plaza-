const { query } = require('../config/db');
const { getCache, setCache, deleteCache } = require('../config/redis');
const CartService = require('./cartService');

class OrderService {
  // Create Order with PostgreSQL Transaction (CRITICAL BUSINESS LOGIC)
  static async createOrder(userId) {
    try {
      // STEP A: Fetch all cart items
      const cartItemsQuery = `
        SELECT 
          ci.product_id,
          ci.quantity,
          p.price,
          p.stock,
          p.title,
          p.is_active,
          p.store_id
        FROM cart ci
        INNER JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1 AND p.is_deleted = false
      `;
      
      const cartItemsResult = await query(cartItemsQuery, [userId]);
      
      if (cartItemsResult.rows.length === 0) {
        throw new Error('Cart is empty');
      }
      
      // STEP B: Validate stock availability
      for (const item of cartItemsResult.rows) {
        if (!item.is_active) {
          throw new Error(`Product "${item.title}" is no longer available`);
        }
        
        if (item.stock < item.quantity) {
          throw new Error(`Insufficient stock for product "${item.title}". Available: ${item.stock}, Requested: ${item.quantity}`);
        }
      }
      
      // STEP C: Calculate total price from database (NEVER trust frontend)
      let totalAmount = 0;
      const orderItems = [];
      
      for (const item of cartItemsResult.rows) {
        const itemTotal = parseFloat(item.price) * item.quantity;
        totalAmount += itemTotal;
        
        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_purchase: item.price,
          store_id: item.store_id
        });
      }
      
      // Round to 2 decimal places to avoid floating point issues
      totalAmount = Math.round(totalAmount * 100) / 100;
      
      // STEP D: Insert order
      const insertOrderQuery = `
        INSERT INTO orders (user_id, buyer_id, total_amount, status, currency)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, buyer_id, total_amount, status, currency, created_at
      `;
      
      const orderResult = await query(insertOrderQuery, [
        userId,
        userId,
        totalAmount,
        'pending',
        'USD'
      ]);
      
      const newOrder = orderResult.rows[0];
      
      // STEP E: Insert order_items
      for (const item of orderItems) {
        const insertOrderItemQuery = `
          INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
          VALUES ($1, $2, $3, $4)
          RETURNING id, order_id, product_id, quantity, price_at_purchase
        `;
        
        await query(insertOrderItemQuery, [
          newOrder.id,
          item.product_id,
          item.quantity,
          item.price_at_purchase
        ]);
      }
      
      // STEP F: Reduce product stock
      for (const item of cartItemsResult.rows) {
        const updateStockQuery = `
          UPDATE products
          SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, stock
        `;
        
        await query(updateStockQuery, [item.quantity, item.product_id]);
      }
      
      // STEP G: Clear cart
      const clearCartQuery = `
        DELETE FROM cart
        WHERE user_id = $1
      `;
      
      await query(clearCartQuery, [userId]);
      
      // Invalidate caches
      await this.invalidateOrderCaches(userId);
      await CartService.invalidateCartCache(userId);
      
      // Return order with items
      const orderWithItems = await this.getOrderById(newOrder.id, userId);
      
      return orderWithItems;
    } catch (error) {
      // If ANY step fails → ROLLBACK
      await query('ROLLBACK');
      throw error;
    }
  }
  
  // Get order by ID for user
  static async getOrderById(orderId, userId = null) {
    try {
      // Check cache first
      const cacheKey = userId ? `order:${orderId}:${userId}` : `order:${orderId}`;
      const cachedOrder = await getCache(cacheKey);
      
      if (cachedOrder) {
        return JSON.parse(cachedOrder);
      }
      
      // Get order details
      let orderQuery = `
        SELECT 
          o.id,
          o.user_id,
          o.total_amount,
          o.status,
          o.currency,
          o.created_at,
          o.updated_at,
          u.name as customer_name,
          u.email as customer_email
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        WHERE o.id = $1
      `;
      
      const queryParams = [orderId];
      
      if (userId) {
        orderQuery += ' AND o.user_id = $2';
        queryParams.push(userId);
      }
      
      const orderResult = await query(orderQuery, queryParams);
      
      if (orderResult.rows.length === 0) {
        return null;
      }
      
      const order = orderResult.rows[0];
      
      // Get order items
      const itemsQuery = `
        SELECT 
          oi.id,
          oi.product_id,
          oi.quantity,
          oi.price_at_purchase,
          p.title,
          (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as product_image
        FROM order_items oi
        INNER JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        ORDER BY oi.id ASC
      `;
      
      const itemsResult = await query(itemsQuery, [orderId]);
      order.items = itemsResult.rows;
      
      // Cache the result for 1 hour
      await setCache(cacheKey, JSON.stringify(order), 3600);
      
      return order;
    } catch (error) {
      throw error;
    }
  }
  
  // Get user's orders with pagination
  static async getUserOrders(userId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = filters;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const parsedLimit = Math.min(parseInt(limit), 100);
      
      // Build WHERE conditions
      const conditions = ['o.user_id = $1'];
      const params = [userId];
      let paramIndex = 2;
      
      if (status) {
        conditions.push(`o.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
      
      if (start_date) {
        conditions.push(`o.created_at >= $${paramIndex}`);
        params.push(start_date);
        paramIndex++;
      }
      
      if (end_date) {
        conditions.push(`o.created_at <= $${paramIndex}`);
        params.push(end_date);
        paramIndex++;
      }
      
      // Validate sort column
      const allowedSortColumns = ['created_at', 'total_amount', 'status'];
      const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      
      const whereClause = conditions.join(' AND ');
      
      // Get orders
      const ordersQuery = `
        SELECT 
          o.id,
          o.total_amount,
          o.status,
          o.currency,
          o.created_at,
          o.updated_at,
          COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE ${whereClause}
        GROUP BY o.id, o.total_amount, o.status, o.currency, o.created_at, o.updated_at
        ORDER BY o.${sortColumn} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(parsedLimit, offset);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM orders o
        WHERE ${whereClause}
      `;
      
      const countParams = params.slice(0, -2);
      
      const [ordersResult, countResult] = await Promise.all([
        query(ordersQuery, params),
        query(countQuery, countParams)
      ]);
      
      const totalOrders = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalOrders / parsedLimit);
      
      return {
        orders: ordersResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_orders: totalOrders,
          orders_per_page: parsedLimit,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1
        },
        filters: {
          status,
          start_date,
          end_date,
          sort_by: sortColumn,
          sort_order: sortDirection.toLowerCase()
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Get all orders (Admin only)
  static async getAllOrders(filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        user_id,
        email,
        start_date,
        end_date,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = filters;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const parsedLimit = Math.min(parseInt(limit), 100);
      
      // Build WHERE conditions
      const conditions = [];
      const params = [];
      let paramIndex = 1;
      
      if (status) {
        conditions.push(`o.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
      
      if (user_id) {
        conditions.push(`o.user_id = $${paramIndex}`);
        params.push(user_id);
        paramIndex++;
      }
      
      if (email) {
        conditions.push(`u.email ILIKE $${paramIndex}`);
        params.push(`%${email}%`);
        paramIndex++;
      }
      
      if (start_date) {
        conditions.push(`o.created_at >= $${paramIndex}`);
        params.push(start_date);
        paramIndex++;
      }
      
      if (end_date) {
        conditions.push(`o.created_at <= $${paramIndex}`);
        params.push(end_date);
        paramIndex++;
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Validate sort column
      const allowedSortColumns = ['created_at', 'total_amount', 'status', 'user_id'];
      const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      
      // Get orders
      const ordersQuery = `
        SELECT 
          o.id,
          o.user_id,
          o.total_amount,
          o.status,
          o.currency,
          o.created_at,
          o.updated_at,
          u.name as customer_name,
          u.email as customer_email,
          COUNT(oi.id) as item_count
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        ${whereClause}
        GROUP BY o.id, o.user_id, o.total_amount, o.status, o.currency, o.created_at, o.updated_at, u.name, u.email
        ORDER BY o.${sortColumn} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(parsedLimit, offset);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        ${whereClause}
      `;
      
      const countParams = params.slice(0, -2);
      
      const [ordersResult, countResult] = await Promise.all([
        query(ordersQuery, params),
        query(countQuery, countParams)
      ]);
      
      const totalOrders = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalOrders / parsedLimit);
      
      return {
        orders: ordersResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_orders: totalOrders,
          orders_per_page: parsedLimit,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1
        },
        filters: {
          status,
          user_id,
          email,
          start_date,
          end_date,
          sort_by: sortColumn,
          sort_order: sortDirection.toLowerCase()
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Update order status (Admin only)
  static async updateOrderStatus(orderId, status, notes = null) {
    try {
      // Check if order exists
      const orderCheckQuery = 'SELECT id, status FROM orders WHERE id = $1';
      const orderCheckResult = await query(orderCheckQuery, [orderId]);
      
      if (orderCheckResult.rows.length === 0) {
        throw new Error('Order not found');
      }
      
      const currentStatus = orderCheckResult.rows[0].status;
      
      // Validate status transitions
      const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['processing', 'cancelled'],
        'processing': ['shipped', 'cancelled'],
        'shipped': ['delivered'],
        'delivered': [],
        'cancelled': []
      };
      
      if (!validTransitions[currentStatus].includes(status)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${status}`);
      }
      
      // Update order status
      const updateQuery = `
        UPDATE orders
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, status, updated_at
      `;
      
      const updateResult = await query(updateQuery, [status, orderId]);
      
      // Add status change note if provided
      if (notes) {
        const noteQuery = `
          INSERT INTO order_notes (order_id, note, created_by)
          VALUES ($1, $2, $3)
        `;
        
        await query(noteQuery, [orderId, notes, 'admin']);
      }
      
      // Invalidate cache
      await deleteCache(`order:${orderId}`);
      
      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get order statistics (Admin only)
  static async getOrderStatistics() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
          COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(AVG(total_amount), 0) as average_order_value
        FROM orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;
      
      const statsResult = await query(statsQuery);
      
      return statsResult.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Invalidate order caches
  static async invalidateOrderCaches(userId) {
    try {
      // Invalidate user's order list cache
      await deleteCache(`orders:${userId}:*`);
      
      // Invalidate specific order caches
      // In production, you might use pattern matching for more efficient cache invalidation
    } catch (error) {
      console.error('Error invalidating order caches:', error);
    }
  }
}

module.exports = OrderService;
