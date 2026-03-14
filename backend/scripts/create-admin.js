const { Pool } = require('../src/config/db');

/**
 * SECURE ADMIN USER CREATION SCRIPT
 * 
 * This script creates an admin user safely in the database.
 * Run this script only in production environment with proper security.
 * 
 * USAGE: node scripts/create-admin.js
 */

async function createAdminUser() {
  try {
    console.log('🔐 Creating secure admin user...');
    
    // Check if we're in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ This script can only run in production environment');
      process.exit(1);
    }

    // Get admin details from environment or use defaults
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gulplaza.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SecureAdminPass123!';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    console.log('📧 Admin Email:', adminEmail);
    console.log('📧 Admin Name:', adminName);

    // Connect to database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 30000,
    });

    try {
      // Check if admin user already exists
      const existingAdmin = await pool.query(
        'SELECT id, email FROM users WHERE email = $1 OR role = $2',
        [adminEmail, 'admin']
      );

      if (existingAdmin.rows.length > 0) {
        console.log('✅ Admin user already exists:', existingAdmin.rows[0]);
        console.log('📧 Email:', existingAdmin.rows[0].email);
        console.log('📧 User ID:', existingAdmin.rows[0].id);
        return;
      }

      // Create admin user
      const hashedPassword = await pool.query(
        'SELECT crypt($1, gen_salt(\'md5\'), $2) as password_hash',
        [adminPassword, 'admin']
      );

      const insertResult = await pool.query(
        `INSERT INTO users (name, email, password, role, phone, is_verified, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING id, email, name`,
        [adminName, adminEmail, hashedPassword.rows[0].password_hash, 'admin', '+9230012345678', true, 'NOW()', 'NOW()']
      );

      console.log('✅ Admin user created successfully:');
      console.log('📧 Email:', insertResult.rows[0].email);
      console.log('📧 Name:', insertResult.rows[0].name);
      console.log('📧 User ID:', insertResult.rows[0].id);
      console.log('📧 Role:', insertResult.rows[0].role);
      
    } catch (error) {
      console.error('❌ Error creating admin user:', error.message);
      throw error;
    } finally {
      await pool.end();
    }
  }

  // Run the function
  createAdminUser()
    .then(() => {
      console.log('🎉 Admin creation script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error.message);
      process.exit(1);
    });
}

// Security: Only run this in production with proper environment variables
if (require.main === module) {
  createAdminUser();
}
