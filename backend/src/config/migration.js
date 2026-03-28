const fs = require('fs').promises;
const path = require('path');

// Run database migrations
const runMigrations = async (pool) => {
  try {
    console.log('🔄 Running database migrations...');
    
    // Check if tables already exist
    const tablesCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const tableCount = parseInt(tablesCheck.rows[0].count);
    console.log(`📊 Found ${tableCount} tables in database`);
    
    if (tableCount > 0) {
      console.log('✅ Tables already exist, skipping main schema creation');
    } else {
      // Read and execute the main schema file
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      const schemaSQL = await fs.readFile(schemaPath, 'utf8');
      
      console.log('📝 Executing main schema...');
      await pool.query(schemaSQL);
      console.log('✅ Main schema executed successfully');
    }
    
    // Run additional migrations if they exist
    const migrationsPath = path.join(__dirname, '../../database/migrations');
    const migrationFiles = await fs.readdir(migrationsPath);
    
    // Sort migration files by name
    const sortedMigrations = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const migrationFile of sortedMigrations) {
      console.log(`📝 Running migration: ${migrationFile}`);
      const migrationPath = path.join(migrationsPath, migrationFile);
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      await pool.query(migrationSQL);
      console.log(`✅ Migration ${migrationFile} completed`);
    }
    
    console.log('🎉 All migrations completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

module.exports = { runMigrations };
