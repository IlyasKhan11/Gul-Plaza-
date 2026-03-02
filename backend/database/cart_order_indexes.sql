-- Cart + Order System Database Indexes
-- These indexes optimize performance for cart and order operations

-- CART SYSTEM INDEXES

-- Index for cart item lookups by user
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- Index for cart item lookups by product
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Composite index for user's cart items (most common query)
CREATE INDEX IF NOT EXISTS idx_cart_items_user_product ON cart_items(user_id, product_id);

-- Index for cart item timestamps (for sorting)
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at);
CREATE INDEX IF NOT EXISTS idx_cart_items_updated_at ON cart_items(updated_at);

-- ORDER SYSTEM INDEXES

-- Index for order lookups by user (buyer orders)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Index for order status filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index for order date filtering (most common sort)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Index for order amount filtering
CREATE INDEX IF NOT EXISTS idx_orders_total_amount ON orders(total_amount);

-- Composite index for user orders with status (common admin query)
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);

-- Composite index for date range queries with status
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, created_at);

-- ORDER ITEMS INDEXES

-- Index for order item lookups by order
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Index for order item lookups by product (for seller analytics)
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Composite index for order items with product (for order details)
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);

-- Index for order item prices (for analytics)
CREATE INDEX IF NOT EXISTS idx_order_items_unit_price ON order_items(unit_price);
CREATE INDEX IF NOT EXISTS idx_order_items_total_price ON order_items(total_price);

-- PERFORMANCE INDEXES FOR COMPLEX QUERIES

-- Composite index for order statistics queries
CREATE INDEX IF NOT EXISTS idx_orders_stats_composite ON orders(created_at, status, total_amount);

-- Index for order status updates (admin operations)
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);

-- Index for cart operations with product stock checks
CREATE INDEX IF NOT EXISTS idx_products_cart_stock ON products(id, stock, is_active, is_deleted);

-- Index for order creation with stock locking
CREATE INDEX IF NOT EXISTS idx_products_order_lock ON products(id, stock) WHERE is_deleted = false;

-- FOREIGN KEY INDEXES (PostgreSQL automatically creates these, but explicit for clarity)

-- Index for user relationships
CREATE INDEX IF NOT EXISTS idx_orders_user_fk ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_fk ON cart_items(user_id);

-- Index for product relationships
CREATE INDEX IF NOT EXISTS idx_cart_items_product_fk ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_fk ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_fk ON order_items(order_id);

-- PARTIAL INDEXES FOR BETTER PERFORMANCE

-- Index for active orders only (most queries filter out cancelled/delivered)
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(created_at, user_id) WHERE status NOT IN ('delivered', 'cancelled');

-- Index for pending orders (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(created_at) WHERE status = 'pending';

-- Index for items in active carts only
CREATE INDEX IF NOT EXISTS idx_cart_items_active ON cart_items(user_id, created_at) WHERE product_id IN (SELECT id FROM products WHERE is_deleted = false AND is_active = true);

-- ANALYTICS INDEXES

-- Index for revenue calculations by date
CREATE INDEX IF NOT EXISTS idx_orders_revenue_date ON orders(created_at, total_amount) WHERE status NOT IN ('cancelled');

-- Index for product sales analytics
CREATE INDEX IF NOT EXISTS idx_order_items_product_sales ON order_items(product_id, quantity, total_price);

-- Index for customer order history
CREATE INDEX IF NOT EXISTS idx_orders_customer_history ON orders(user_id, created_at DESC);

-- Comments explaining the critical indexes
COMMENT ON INDEX idx_cart_items_user_id IS 'Optimizes cart lookups by user';
COMMENT ON INDEX idx_cart_items_product_id IS 'Optimizes cart operations by product';
COMMENT ON INDEX idx_cart_items_user_product IS 'Optimizes user cart queries (most common)';
COMMENT ON INDEX idx_orders_user_id IS 'Optimizes buyer order lookups';
COMMENT ON INDEX idx_orders_status IS 'Optimizes order status filtering';
COMMENT ON INDEX idx_orders_created_at IS 'Optimizes order sorting by date';
COMMENT ON INDEX idx_order_items_order_id IS 'Optimizes order item retrieval';
COMMENT ON INDEX idx_order_items_product_id IS 'Optimizes product sales analytics';
COMMENT ON INDEX idx_orders_user_status IS 'Optimizes admin order management';
COMMENT ON INDEX idx_orders_active IS 'Optimizes active order queries (partial index)';
COMMENT ON INDEX idx_orders_pending IS 'Optimizes admin pending order dashboard';
COMMENT ON INDEX idx_products_order_lock IS 'Critical for order creation stock locking';

-- MONITORING INDEXES

-- Index for order processing performance
CREATE INDEX IF NOT EXISTS idx_orders_processing ON orders(status, created_at, updated_at);

-- Index for cart abandonment analysis
CREATE INDEX IF NOT EXISTS idx_cart_items_abandonment ON cart_items(created_at, user_id);

-- Index for high-value orders (fraud detection)
CREATE INDEX IF NOT EXISTS idx_orders_high_value ON orders(total_amount, created_at) WHERE total_amount > 1000;

-- Ensure proper statistics collection for query optimization
ANALYZE cart_items;
ANALYZE orders;
ANALYZE order_items;
ANALYZE products;
