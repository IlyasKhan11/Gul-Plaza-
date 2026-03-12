const { Pool } = require('pg');

// Build connection config — prefer DATABASE_URL (Railway auto-provides it for linked Postgres),
// but fall back to individual DB_* variables if DATABASE_URL is not set.
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

console.log('DB config mode:', process.env.DATABASE_URL ? 'DATABASE_URL' : 'individual vars');
console.log('DB host:', process.env.DATABASE_URL ? '(from DATABASE_URL)' : process.env.DB_HOST);

// PostgreSQL connection pool configuration
const pool = new Pool({
  ...poolConfig,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  application_name: 'gul_plaza_backend',
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Log errors but do NOT exit — let the app keep running and retry
pool.on('error', (err) => {
  console.error('⚠️  Unexpected error on idle PostgreSQL client:', err.message);
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
