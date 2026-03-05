// Test script to create sample product reports
const { query } = require('./src/config/db');

async function createSampleReports() {
  try {
    console.log('🔍 Creating sample product reports...');

    // Get some sample products and users
    const productsResult = await query('SELECT id, title FROM products LIMIT 5');
    const buyersResult = await query('SELECT id, name, email FROM users WHERE role = \'buyer\' LIMIT 3');

    if (productsResult.rows.length === 0 || buyersResult.rows.length === 0) {
      console.log('❌ No products or buyers found. Please create some first.');
      return;
    }

    const reports = [
      {
        product_id: productsResult.rows[0].id,
        reporter_id: buyersResult.rows[0].id,
        reason: 'fake_product',
        description: 'This product appears to be counterfeit. The quality is very poor compared to the description.'
      },
      {
        product_id: productsResult.rows[1]?.id || productsResult.rows[0].id,
        reporter_id: buyersResult.rows[1]?.id || buyersResult.rows[0].id,
        reason: 'misleading_description',
        description: 'The product description says it includes accessories but it came with nothing.'
      },
      {
        product_id: productsResult.rows[2]?.id || productsResult.rows[0].id,
        reporter_id: buyersResult.rows[2]?.id || buyersResult.rows[0].id,
        reason: 'inappropriate_content',
        description: 'The product images contain inappropriate content that should not be on this platform.'
      }
    ];

    for (const report of reports) {
      try {
        // Check if report already exists
        const existingReport = await query(
          'SELECT id FROM product_reports WHERE product_id = $1 AND reporter_id = $2',
          [report.product_id, report.reporter_id]
        );

        if (existingReport.rows.length > 0) {
          console.log(`⚠️  Report already exists for product ${report.product_id} by user ${report.reporter_id}`);
          continue;
        }

        // Insert the report
        const result = await query(
          `INSERT INTO product_reports (product_id, reporter_id, reason, description)
           VALUES ($1, $2, $3, $4)
           RETURNING id, product_id, reason, status, created_at`,
          [report.product_id, report.reporter_id, report.reason, report.description]
        );

        console.log(`✅ Created report ${result.rows[0].id}: ${report.reason} for product ${report.product_id}`);
      } catch (error) {
        console.log(`❌ Failed to create report:`, error.message);
      }
    }

    console.log('\n📊 Sample reports created successfully!');
    console.log('👤 Buyers can now report products from the product detail page');
    console.log('👨‍💼 Admins can view and manage reports in the admin dashboard');

  } catch (error) {
    console.error('❌ Error creating sample reports:', error);
  }
}

createSampleReports().then(() => {
  console.log('🎉 Test script completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
