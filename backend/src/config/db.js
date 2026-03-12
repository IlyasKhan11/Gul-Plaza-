const { Pool } = require('pg');

// PostgreSQL connection pool configuration
const pool = new Pool({
  host: process.env.RAILWAY_PRIVATE_DOMAIN || process.env.DB_HOST,
  port: process.env.RAILWAY_TCP_PROXY_PORT || process.env.DB_PORT,
  database: process.env.PGDATABASE || process.env.DB_NAME,
  user: process.env.PGUSER || process.env.DB_USER,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  application_name: 'gul_plaza_backend'
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries with parameterized inputs to prevent SQL injection
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Retry mechanism for database operations
const queryWithRetry = async (text, params, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await query(text, params);
    } catch (error) {
      console.error(`Database query attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Initialize database tables (will be expanded as needed)
const initializeDatabase = async () => {
  try {
    console.log('Testing database connection first...');
    
    // Simple connection test
    const testResult = await query('SELECT NOW()');
    console.log('✅ Database connection test successful:', testResult.rows[0]);
    
    console.log('Creating database tables...');
    
    // Create users table if it doesn't exist (updated schema)
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL CHECK (role IN ('buyer', 'seller', 'admin')),
        phone VARCHAR(255) NOT NULL,
        is_verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created/verified');

    // Create store table if it doesn't exist
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS stores (
        id BIGSERIAL PRIMARY KEY,
        owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        logo_url TEXT NOT NULL,
        banner_url TEXT NOT NULL,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Stores table created/verified');

    // Add missing columns to stores table (ALTER is safe with IF NOT EXISTS)
    await query(`ALTER TABLE stores ALTER COLUMN description DROP NOT NULL`).catch(() => {});
    await query(`ALTER TABLE stores ALTER COLUMN logo_url DROP NOT NULL`).catch(() => {});
    await query(`ALTER TABLE stores ALTER COLUMN banner_url DROP NOT NULL`).catch(() => {});
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_email TEXT`);
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20)`);
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS address TEXT`);
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS country VARCHAR(100)`);
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20)`);
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_license VARCHAR(100)`);
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50)`);
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_settings JSONB`);
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
    await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false`);

    // Create categories table if it doesn't exist (based on ERD and SQL shown)
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) UNIQUE NOT NULL,
        parent_id BIGINT,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_parent_category FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    // Create products table if it doesn't exist (fixing OCR errors from ERD)
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGSERIAL PRIMARY KEY,
        store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
        stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_images table if it doesn't exist (fixing OCR errors)
    await query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id BIGSERIAL PRIMARY KEY,
        product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        public_id TEXT, -- Cloudinary public_id for image management
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table if it doesn't exist (fixing OCR errors)
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id BIGSERIAL PRIMARY KEY,
        buyer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
        total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create order_items table if it doesn't exist (based on ERD)
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id BIGSERIAL PRIMARY KEY,
        order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        price_at_purchase DECIMAL(10,2) NOT NULL CHECK (price_at_purchase >= 0),
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payments table for offline payment system
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id BIGSERIAL PRIMARY KEY,
        order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('offline', 'online')),
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
        transaction_id TEXT,
        payment_details JSONB,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create cart table
    await query(`
      CREATE TABLE IF NOT EXISTS cart (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(20),
        avatar_url TEXT,
        bio TEXT,
        preferences JSONB,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    // Create user_blocks table for admin user management
    await query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_by BIGINT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_reports table
    await query(`
      CREATE TABLE IF NOT EXISTS product_reports (
        id BIGSERIAL PRIMARY KEY,
        product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        reporter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(100) NOT NULL CHECK (reason IN (
          'inappropriate_content','fake_product','misleading_description',
          'spam','copyright_violation','other'
        )),
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending','under_review','resolved','dismissed'
        )),
        admin_notes TEXT,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, reporter_id)
      )
    `);

    // Create product_ratings table
    await query(`
      CREATE TABLE IF NOT EXISTS product_ratings (
        id BIGSERIAL PRIMARY KEY,
        product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        buyer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        is_verified_purchase BOOLEAN DEFAULT false,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, buyer_id)
      )
    `);

    // Add missing columns to orders table
    await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE RESTRICT`);
    await query(`UPDATE orders SET user_id = buyer_id WHERE user_id IS NULL`).catch(() => {});
    await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'PKR'`);
    await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`);

    // Add missing columns to products table
    await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false`);
    await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id BIGINT REFERENCES users(id) ON DELETE RESTRICT`).catch(() => {});

    // Create indexes for better performance
    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await query('CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)');
    await query('CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)');
    await query('CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON products(is_deleted)');
    await query('CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock)');
    await query('CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)');
    await query('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status)');
    await query('CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_blocks_user_id ON user_blocks(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_blocks_active ON user_blocks(is_active)');
    await query('CREATE INDEX IF NOT EXISTS idx_product_reports_product_id ON product_reports(product_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_product_reports_reporter_id ON product_reports(reporter_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_product_reports_status ON product_reports(status)');

    // Create indexes for product_ratings
    await query('CREATE INDEX IF NOT EXISTS idx_product_ratings_product_id ON product_ratings(product_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_product_ratings_buyer_id ON product_ratings(buyer_id)');

    // Create updated_at trigger function
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Array of tables that need to updated_at trigger
    const tablesWithTimestamps = [
      'users', 'stores', 'categories', 'products',
      'orders', 'user_profiles', 'user_blocks', 'payments', 'cart', 'product_reports'
    ];

    // Safely drop and recreate triggers for each table
    for (const tableName of tablesWithTimestamps) {
      await query(`DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON ${tableName}`);
      await query(`
        CREATE TRIGGER update_${tableName}_updated_at
          BEFORE UPDATE ON ${tableName}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  initializeDatabase,
};
