const { Pool } = require('pg');

// Railway database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:wkXJNyTTQryauLqVSiRZbKkpVVvuVBDm@postgres-production-9f75.up.railway.app:5432/railway',
  ssl: { rejectUnauthorized: false }
});

async function createWishlistTable() {
  try {
    console.log('🔄 Connecting to Railway database...');
    
    // Create the wishlists table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS wishlists (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `;
    
    await pool.query(createTableSQL);
    console.log('✅ Wishlists table created successfully!');
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_wishlists_created_at ON wishlists(created_at)');
    console.log('✅ Wishlists indexes created successfully!');
    
    // Verify table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'wishlists'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verification successful: wishlists table exists in database!');
      
      // Test with a simple query
      const countResult = await pool.query('SELECT COUNT(*) as count FROM wishlists');
      console.log(`✅ Table is working. Current entries: ${countResult.rows[0].count}`);
    } else {
      console.log('❌ Verification failed: wishlists table still not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createWishlistTable();
