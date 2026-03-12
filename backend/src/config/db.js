const { Pool } = require('pg');

// PostgreSQL connection pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 60000,
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

// Initialize database tables using migration system
const initializeDatabase = async () => {
  try {
    console.log('Testing database connection first...');
    
    // Simple connection test
    const testResult = await query('SELECT NOW()');
    console.log('✅ Database connection test successful:', testResult.rows[0]);
    
    // Run migrations using schema.sql and migration files
    const { runMigrations } = require('./migration');
    await runMigrations(pool);
    
    console.log('✅ Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = { query, queryWithRetry, initializeDatabase };
