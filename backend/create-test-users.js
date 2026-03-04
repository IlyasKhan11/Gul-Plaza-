const bcrypt = require('bcrypt');

const createTestUser = async (name, email, password, phone, role) => {
  const hashedPassword = await bcrypt.hash(password, 12);
  
  console.log(`📧 ${role.toUpperCase()} ACCOUNT:`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Phone: ${phone}`);
  console.log(`   Hashed Password: ${hashedPassword}`);
  console.log('');
  
  return { email, password: hashedPassword, phone, role };
};

const main = async () => {
  console.log('🔧 GENERATING TEST CREDENTIALS FOR ALL ROLES');
  console.log('==========================================');
  
  const testUsers = await Promise.all([
    createTestUser('Test Buyer', 'buyer.test.micro@gmail.com', 'Test123!', '+923001234567', 'buyer'),
    createTestUser('Test Seller', 'seller.test.micro@gmail.com', 'Test123!', '+923001234568', 'seller'),
    createTestUser('Test Admin', 'admin.test.micro@gmail.com', 'Test123!', '+923001234569', 'admin')
  ]);
  
  console.log('📋 SQL INSERT QUERIES:');
  console.log('==========================================');
  
  testUsers.forEach(user => {
    console.log(`INSERT INTO users (name, email, password, phone, role, is_verified) VALUES ('Test ${user.role}', '${user.email}', '${user.password}', '${user.phone}', '${user.role}', true);`);
  });
  
  console.log('');
  console.log('🎯 READY FOR MANUAL DATABASE INSERTION!');
  console.log('📱 Save these credentials for testing:');
  console.log('   - Frontend Login Testing');
  console.log('   - API Testing with Postman/curl');
  console.log('   - Role-based Access Testing');
};

main().catch(console.error);
