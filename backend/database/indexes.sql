-- Product Module Database Indexes
-- These indexes optimize performance for product queries

-- Index for product lookups by ID (primary key already exists)
-- CREATE INDEX IF NOT EXISTS idx_products_id ON products(id);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Index for seller/store filtering
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);

-- Index for title search (ILIKE operations)
CREATE INDEX IF NOT EXISTS idx_products_title_gin ON products USING gin(title gin_trgm_ops);

-- Index for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON products(is_deleted);

-- Composite index for active products by category (common query pattern)
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_deleted, is_active);

-- Composite index for seller's active products
CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, is_deleted, is_active);

-- Index for sorting by price (common sort option)
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Index for sorting by created_at (default sort)
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Index for stock filtering (low stock alerts)
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- Product images indexes
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Full-text search index for product titles and descriptions
-- This requires the pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast text search
CREATE INDEX IF NOT EXISTS idx_products_search_gin ON products USING gin((title || ' ' || description) gin_trgm_ops);

-- Composite index for product listings with category and price range
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products(category_id, price, is_deleted);

-- Index for updated_at (cache invalidation)
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- Store indexes for seller queries
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

-- Category indexes
CREATE INDEX IF NOT EXISTS idx_categories_id ON categories(id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Order items indexes for product deletion checks
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Comments explaining the indexes
COMMENT ON INDEX idx_products_category_id IS 'Optimizes product filtering by category';
COMMENT ON INDEX idx_products_store_id IS 'Optimizes product filtering by store/seller';
COMMENT ON INDEX idx_products_title_gin IS 'Optimizes text search on product titles using trigrams';
COMMENT ON INDEX idx_products_is_deleted IS 'Optimizes soft delete filtering';
COMMENT ON INDEX idx_products_category_active IS 'Optimizes active products by category queries';
COMMENT ON INDEX idx_products_store_active IS 'Optimizes seller product queries';
COMMENT ON INDEX idx_products_price IS 'Optimizes price-based sorting and filtering';
COMMENT ON INDEX idx_products_created_at IS 'Optimizes chronological sorting';
COMMENT ON INDEX idx_products_stock IS 'Optimizes stock-based queries and alerts';
COMMENT ON INDEX idx_product_images_product_id IS 'Optimizes product image retrieval';
COMMENT ON INDEX idx_products_search_gin IS 'Optimizes full-text search across title and description';
COMMENT ON INDEX idx_products_category_price IS 'Optimizes category + price range queries';
COMMENT ON INDEX idx_products_updated_at IS 'Optimizes cache invalidation queries';
COMMENT ON INDEX idx_stores_owner_id IS 'Optimizes store lookup by owner';
COMMENT ON INDEX idx_categories_slug IS 'Optimizes category lookup by slug';
COMMENT ON INDEX idx_order_items_product_id IS 'Optimizes product order history checks';
COMMENT ON INDEX idx_orders_status IS 'Optimizes order status filtering';
