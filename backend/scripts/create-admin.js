require('dotenv').config();
const bcrypt = require('bcrypt');
const readline = require('readline');
const { Pool } = require('pg');

// Create a database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createAdmin() {
    console.log('\n🔐 Create Secure Admin Account\n');

    try {
        const name = await question('Enter admin name: ');
        const email = await question('Enter admin email: ');
        const phone = await question('Enter admin phone (optional): ');
        let password = await question('Enter admin password (min 8 chars): ');

        while (password.length < 8) {
            console.log('Password must be at least 8 characters long.');
            password = await question('Enter admin password (min 8 chars): ');
        }

        console.log('\nCreating admin account...');

        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            console.log(`\n❌ Error: User with email ${email} already exists.`);
            process.exit(1);
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert admin into database
        await pool.query(
            `INSERT INTO users (name, email, password, phone, role, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [name, email, passwordHash, phone || null, 'admin', true]
        );

        console.log('\n✅ Admin account created successfully!');
        console.log(`You can now log in at the admin portal using ${email}`);

    } catch (error) {
        console.error('\n❌ Error creating admin:', error.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

createAdmin();
