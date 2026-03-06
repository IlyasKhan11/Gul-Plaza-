const { query } = require('../config/db');
const notificationService = require('../services/notificationService');

// Create withdrawal request (called by sellers)
const createWithdrawalRequest = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { amount, bank_name, account_number, account_name, notes } = req.body;

    // Validate required fields
    if (!amount || !bank_name || !account_number || !account_name) {
      return res.status(400).json({
        success: false,
        message: 'Amount, bank name, account number, and account name are required'
      });
    }

    // Check if seller has sufficient balance
    const balanceResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as balance
      FROM transactions
      WHERE seller_id = $1 AND status = 'completed'
    `, [sellerId]);

    const balance = parseFloat(balanceResult.rows[0].balance);

    // Check for pending withdrawals
    const pendingResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as pending
      FROM withdrawal_requests
      WHERE seller_id = $1 AND status = 'pending'
    `, [sellerId]);

    const pendingAmount = parseFloat(pendingResult.rows[0].pending);
    const availableBalance = balance - pendingAmount;

    if (parseFloat(amount) > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: Rs. ${availableBalance.toFixed(2)}`
      });
    }

    // Get store info
    const storeResult = await query(`
      SELECT id, name FROM stores WHERE owner_id = $1
    `, [sellerId]);

    if (storeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const store = storeResult.rows[0];

    // Create withdrawal request
    const result = await query(`
      INSERT INTO withdrawal_requests
      (seller_id, store_id, amount, bank_name, account_number, account_name, notes, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [sellerId, store.id, amount, bank_name, account_number, account_name, notes]);

    const withdrawal = result.rows[0];

    // Notify admins of new withdrawal request
    notificationService.sendToAdmins(notificationService.NotificationEvents.NEW_WITHDRAWAL_REQUEST, {
      withdrawalId: withdrawal.id,
      amount: amount,
      storeName: store.name,
      sellerId: sellerId,
      requestedAt: withdrawal.created_at,
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        created_at: withdrawal.created_at
      }
    });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get platform settings (commission rate)
const getPlatformSettings = async (req, res) => {
  try {
    const result = await query(`
      SELECT key, value 
      FROM platform_settings 
      WHERE key = 'commission_rate'
    `);
    
    const commissionRate = result.rows.length > 0 
      ? parseFloat(result.rows[0].value) 
      : 5; // Default 5%
    
    res.status(200).json({
      success: true,
      data: {
        commission_rate: commissionRate
      }
    });
  } catch (error) {
    console.error('Error getting platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update commission rate
const updateCommissionRate = async (req, res) => {
  try {
    const { rate } = req.body;
    
    if (rate === undefined || isNaN(rate) || rate < 0 || rate > 50) {
      return res.status(400).json({
        success: false,
        message: 'Commission rate must be a number between 0 and 50'
      });
    }
    
    // Upsert the commission rate
    await query(`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ('commission_rate', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET 
        value = $1,
        updated_at = CURRENT_TIMESTAMP
    `, [rate.toString()]);
    
    res.status(200).json({
      success: true,
      message: 'Commission rate updated successfully',
      data: { commission_rate: rate }
    });
  } catch (error) {
    console.error('Error updating commission rate:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all transactions with commission data
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);
    
    // First get the commission rate
    const rateResult = await query(`
      SELECT value FROM platform_settings WHERE key = 'commission_rate'
    `);
    const commissionRate = rateResult.rows.length > 0 
      ? parseFloat(rateResult.rows[0].value) 
      : 5;
    
    // Build WHERE clause - handle status filter properly
    let whereClause = "WHERE o.status IN ('delivered', 'cancelled', 'paid')";
    let statusFilter = "";
    
    if (status && status !== 'all') {
      // Use COALESCE to handle both joined table status and computed status
      statusFilter = ` AND COALESCE(ts.status, CASE WHEN o.status = 'delivered' THEN 'released' ELSE 'pending' END) = '${status}'`;
    }
    whereClause += statusFilter;
    
    // Get total count
    const countResult = await query(`
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      LEFT JOIN transaction_slips ts ON o.id = ts.order_id
      ${whereClause}
    `);
    
    const totalTransactions = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalTransactions / parsedLimit);
    
    // Get transactions
    const transactionsQuery = `
      SELECT 
        COALESCE(ts.id::text, 't' || o.id) as id,
        o.id as order_id,
        o.total_amount as amount,
        ROUND(o.total_amount * ${commissionRate} / 100, 2) as commission,
        ROUND(o.total_amount - (o.total_amount * ${commissionRate} / 100), 2) as seller_share,
        COALESCE(ts.status, CASE WHEN o.status = 'delivered' THEN 'released' ELSE 'pending' END) as status,
        o.created_at,
        s.name as store_name,
        s.owner_id as seller_id
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN transaction_slips ts ON o.id = ts.order_id
      ${whereClause}
      GROUP BY ts.id, o.id, s.name, s.owner_id, o.total_amount, o.created_at, ts.status
      ORDER BY o.created_at DESC
      LIMIT ${parsedLimit} OFFSET ${offset}
    `;
    
    const transactionsResult = await query(transactionsQuery);
    
    // Calculate totals
    const totalsQuery = `
      SELECT 
        SUM(ROUND(o.total_amount * ${commissionRate} / 100, 2)) as total_commission,
        SUM(CASE WHEN COALESCE(ts.status, 'pending') = 'released' THEN ROUND(o.total_amount * ${commissionRate} / 100, 2) ELSE 0 END) as released_commission,
        SUM(CASE WHEN COALESCE(ts.status, 'pending') = 'pending' THEN ROUND(o.total_amount * ${commissionRate} / 100, 2) ELSE 0 END) as pending_commission,
        SUM(CASE WHEN COALESCE(ts.status, 'pending') = 'withdrawn' THEN ROUND(o.total_amount - (o.total_amount * ${commissionRate} / 100), 2) ELSE 0 END) as seller_payouts
      FROM orders o
      LEFT JOIN transaction_slips ts ON o.id = ts.order_id
      WHERE o.status IN ('delivered', 'cancelled', 'paid')
    `;
    
    const totalsResult = await query(totalsQuery);
    const totals = totalsResult.rows[0];
    
    res.status(200).json({
      success: true,
      data: {
        transactions: transactionsResult.rows,
        totals: {
          total_commission: parseFloat(totals.total_commission) || 0,
          released_commission: parseFloat(totals.released_commission) || 0,
          pending_commission: parseFloat(totals.pending_commission) || 0,
          seller_payouts: parseFloat(totals.seller_payouts) || 0
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_transactions: totalTransactions,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get commission by seller
const getCommissionsBySeller = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);
    
    // Get commission rate
    const rateResult = await query(`
      SELECT value FROM platform_settings WHERE key = 'commission_rate'
    `);
    const commissionRate = rateResult.rows.length > 0 
      ? parseFloat(rateResult.rows[0].value) 
      : 5;
    
    // Get total sellers with transactions
    const countResult = await query(`
      SELECT COUNT(DISTINCT s.id) as total
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE o.status IN ('delivered', 'cancelled', 'paid')
    `);
    
    const totalSellers = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalSellers / parsedLimit);
    
    // Get commissions by seller
    const sellerCommissionsQuery = `
      SELECT 
        s.id as store_id,
        s.name as store_name,
        s.owner_id as seller_id,
        u.name as seller_name,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.total_amount) as total_gmv,
        SUM(ROUND(o.total_amount * ${commissionRate} / 100, 2)) as total_commission
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE o.status IN ('delivered', 'cancelled', 'paid')
      GROUP BY s.id, s.name, s.owner_id, u.name
      ORDER BY total_gmv DESC
      LIMIT ${parsedLimit} OFFSET ${offset}
    `;
    
    const sellersResult = await query(sellerCommissionsQuery);
    
    res.status(200).json({
      success: true,
      data: {
        sellers: sellersResult.rows.map(s => ({
          store_id: s.store_id,
          store_name: s.store_name,
          seller_name: s.seller_name,
          order_count: parseInt(s.order_count),
          total_gmv: parseFloat(s.total_gmv) || 0,
          total_commission: parseFloat(s.total_commission) || 0,
          commission_rate: commissionRate
        })),
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_sellers: totalSellers,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting commissions by seller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all withdrawal requests
const getWithdrawalRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100);
    
    // Build WHERE clause
    let whereClause = '';
    const params = [];
    
    if (status && status !== 'all') {
      whereClause = 'WHERE wr.status = $1';
      params.push(status);
    }
    
    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM withdrawal_requests wr
      ${whereClause}
    `, params);
    
    const totalWithdrawals = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalWithdrawals / parsedLimit);
    
    // Get withdrawal requests
    const withdrawalsQuery = `
      SELECT 
        wr.id,
        wr.seller_id,
        wr.amount,
        wr.bank_name,
        wr.account_number,
        wr.account_name,
        wr.status,
        wr.created_at,
        s.name as store_name,
        u.name as seller_name
      FROM withdrawal_requests wr
      LEFT JOIN stores s ON wr.seller_id = s.owner_id
      LEFT JOIN users u ON wr.seller_id = u.id
      ${whereClause}
      ORDER BY wr.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const queryParams = [...params, parsedLimit, offset];
    const withdrawalsResult = await query(withdrawalsQuery, queryParams);
    
    // Calculate stats
    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        SUM(amount) FILTER (WHERE status = 'pending') as pending_amount,
        SUM(amount) FILTER (WHERE status = 'approved') as approved_amount
      FROM withdrawal_requests
    `);
    
    const stats = statsResult.rows[0];
    
    res.status(200).json({
      success: true,
      data: {
        withdrawals: withdrawalsResult.rows.map(w => ({
          id: w.id.toString(),
          seller_id: w.seller_id.toString(),
          store_name: w.store_name || w.seller_name,
          amount: parseFloat(w.amount),
          bank_name: w.bank_name,
          account_number: w.account_number,
          account_name: w.account_name,
          status: w.status,
          created_at: w.created_at
        })),
        stats: {
          pending_count: parseInt(stats.pending_count) || 0,
          pending_amount: parseFloat(stats.pending_amount) || 0,
          approved_amount: parseFloat(stats.approved_amount) || 0
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_withdrawals: totalWithdrawals,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting withdrawal requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Approve withdrawal request
const approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if withdrawal exists and is pending
    const checkResult = await query(`
      SELECT id, status FROM withdrawal_requests WHERE id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }
    
    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal request is not pending'
      });
    }
    
    // Update status to approved
    await query(`
      UPDATE withdrawal_requests 
      SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [id]);

    // Send notification to the seller
    const withdrawalResult = await query(`
      SELECT wr.*, s.name as store_name FROM withdrawal_requests wr
      LEFT JOIN stores s ON wr.seller_id = s.owner_id
      WHERE wr.id = $1
    `, [id]);

    if (withdrawalResult.rows.length > 0) {
      const withdrawal = withdrawalResult.rows[0];
      await notificationService.saveNotification(
        withdrawal.seller_id, 'withdrawal',
        'Withdrawal Approved',
        `Your withdrawal request of Rs. ${Number(withdrawal.amount).toLocaleString()} has been approved and will be transferred shortly.`,
        '/seller/payments'
      );
      notificationService.sendToUser(withdrawal.seller_id, notificationService.NotificationEvents.WITHDRAWAL_APPROVED, {
        withdrawalId: withdrawal.id, amount: withdrawal.amount, storeName: withdrawal.store_name,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal request approved successfully'
    });
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Reject withdrawal request
const rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Check if withdrawal exists and is pending
    const checkResult = await query(`
      SELECT id, status FROM withdrawal_requests WHERE id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }
    
    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal request is not pending'
      });
    }
    
    // Update status to rejected
    await query(`
      UPDATE withdrawal_requests 
      SET status = 'rejected', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [reason || null, id]);

    // Send notification to the seller
    const withdrawalResult = await query(`
      SELECT wr.*, s.name as store_name FROM withdrawal_requests wr
      LEFT JOIN stores s ON wr.seller_id = s.owner_id
      WHERE wr.id = $1
    `, [id]);

    if (withdrawalResult.rows.length > 0) {
      const withdrawal = withdrawalResult.rows[0];
      await notificationService.saveNotification(
        withdrawal.seller_id, 'withdrawal',
        'Withdrawal Rejected',
        `Your withdrawal request of Rs. ${Number(withdrawal.amount).toLocaleString()} was rejected. Reason: ${reason || 'Not specified'}.`,
        '/seller/payments'
      );
      notificationService.sendToUser(withdrawal.seller_id, notificationService.NotificationEvents.WITHDRAWAL_REJECTED, {
        withdrawalId: withdrawal.id, amount: withdrawal.amount, storeName: withdrawal.store_name,
        reason: reason || 'Withdrawal request rejected by admin',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Withdrawal request rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Export Transactions as CSV
const exportTransactionsCSV = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Get commission rate
    const rateResult = await query(`
      SELECT value FROM platform_settings WHERE key = 'commission_rate'
    `);
    const commissionRate = rateResult.rows.length > 0 
      ? parseFloat(rateResult.rows[0].value) 
      : 5;
    
    let whereClause = "WHERE o.status IN ('delivered', 'cancelled', 'paid')";
    if (status && status !== 'all') {
      whereClause += ` AND COALESCE(ts.status, CASE WHEN o.status = 'delivered' THEN 'released' ELSE 'pending' END) = '${status}'`;
    }
    
    const transactionsQuery = `
      SELECT 
        o.id as order_id,
        o.total_amount as amount,
        ROUND(o.total_amount * ${commissionRate} / 100, 2) as commission,
        ROUND(o.total_amount - (o.total_amount * ${commissionRate} / 100), 2) as seller_share,
        COALESCE(ts.status, CASE WHEN o.status = 'delivered' THEN 'released' ELSE 'pending' END) as status,
        o.created_at,
        s.name as store_name
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN transaction_slips ts ON o.id = ts.order_id
      ${whereClause}
      GROUP BY ts.id, o.id, s.name, o.total_amount, o.created_at, ts.status
      ORDER BY o.created_at DESC
    `;
    
    const transactionsResult = await query(transactionsQuery);
    
    // Generate CSV
    const headers = ['Order ID', 'Store', 'Amount', 'Commission', 'Seller Share', 'Status', 'Date'];
    const rows = transactionsResult.rows.map(t => [
      t.order_id,
      t.store_name || 'N/A',
      t.amount,
      t.commission,
      t.seller_share,
      t.status,
      new Date(t.created_at).toLocaleDateString()
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting transactions CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Export Transactions as PDF (simple HTML-based)
const exportTransactionsPDF = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Get commission rate
    const rateResult = await query(`
      SELECT value FROM platform_settings WHERE key = 'commission_rate'
    `);
    const commissionRate = rateResult.rows.length > 0 
      ? parseFloat(rateResult.rows[0].value) 
      : 5;
    
    let whereClause = "WHERE o.status IN ('delivered', 'cancelled', 'paid')";
    if (status && status !== 'all') {
      whereClause += ` AND COALESCE(ts.status, CASE WHEN o.status = 'delivered' THEN 'released' ELSE 'pending' END) = '${status}'`;
    }
    
    const transactionsQuery = `
      SELECT 
        o.id as order_id,
        o.total_amount as amount,
        ROUND(o.total_amount * ${commissionRate} / 100, 2) as commission,
        ROUND(o.total_amount - (o.total_amount * ${commissionRate} / 100), 2) as seller_share,
        COALESCE(ts.status, CASE WHEN o.status = 'delivered' THEN 'released' ELSE 'pending' END) as status,
        o.created_at,
        s.name as store_name
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN transaction_slips ts ON o.id = ts.order_id
      ${whereClause}
      GROUP BY ts.id, o.id, s.name, o.total_amount, o.created_at, ts.status
      ORDER BY o.created_at DESC
    `;
    
    const transactionsResult = await query(transactionsQuery);
    
    // Calculate totals
    const totalAmount = transactionsResult.rows.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalCommission = transactionsResult.rows.reduce((sum, t) => sum + parseFloat(t.commission || 0), 0);
    const totalSellerShare = transactionsResult.rows.reduce((sum, t) => sum + parseFloat(t.seller_share || 0), 0);
    
    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transactions Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; }
          .summary p { margin: 5px 0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Transactions Report</h1>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Store</th>
              <th>Amount</th>
              <th>Commission</th>
              <th>Seller Share</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${transactionsResult.rows.map(t => `
              <tr>
                <td>#${t.order_id}</td>
                <td>${t.store_name || 'N/A'}</td>
                <td>Rs. ${parseFloat(t.amount || 0).toLocaleString()}</td>
                <td>Rs. ${parseFloat(t.commission || 0).toLocaleString()}</td>
                <td>Rs. ${parseFloat(t.seller_share || 0).toLocaleString()}</td>
                <td>${t.status}</td>
                <td>${new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Total Amount:</strong> Rs. ${totalAmount.toLocaleString()}</p>
          <p><strong>Total Commission:</strong> Rs. ${totalCommission.toLocaleString()}</p>
          <p><strong>Total Seller Share:</strong> Rs. ${totalSellerShare.toLocaleString()}</p>
        </div>
        <script>window.print()</script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.pdf.html');
    res.send(html);
  } catch (error) {
    console.error('Error exporting transactions PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Export Withdrawals as CSV
const exportWithdrawalsCSV = async (req, res) => {
  try {
    const { status } = req.query;
    
    let whereClause = '';
    if (status && status !== 'all') {
      whereClause = `WHERE wr.status = '${status}'`;
    }
    
    const withdrawalsQuery = `
      SELECT 
        wr.id,
        wr.amount,
        wr.bank_name,
        wr.account_number,
        wr.account_name,
        wr.status,
        wr.created_at,
        s.name as store_name,
        u.name as seller_name
      FROM withdrawal_requests wr
      LEFT JOIN stores s ON wr.seller_id = s.owner_id
      LEFT JOIN users u ON wr.seller_id = u.id
      ${whereClause}
      ORDER BY wr.created_at DESC
    `;
    
    const withdrawalsResult = await query(withdrawalsQuery);
    
    // Generate CSV
    const headers = ['ID', 'Store', 'Seller', 'Amount', 'Bank', 'Account Number', 'Account Name', 'Status', 'Date'];
    const rows = withdrawalsResult.rows.map(w => [
      w.id,
      w.store_name || w.seller_name || 'N/A',
      w.seller_name || 'N/A',
      w.amount,
      w.bank_name,
      w.account_number,
      w.account_name,
      w.status,
      new Date(w.created_at).toLocaleDateString()
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=withdrawals.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting withdrawals CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Export Withdrawals as PDF
const exportWithdrawalsPDF = async (req, res) => {
  try {
    const { status } = req.query;
    
    let whereClause = '';
    if (status && status !== 'all') {
      whereClause = `WHERE wr.status = '${status}'`;
    }
    
    const withdrawalsQuery = `
      SELECT 
        wr.id,
        wr.amount,
        wr.bank_name,
        wr.account_number,
        wr.account_name,
        wr.status,
        wr.created_at,
        s.name as store_name,
        u.name as seller_name
      FROM withdrawal_requests wr
      LEFT JOIN stores s ON wr.seller_id = s.owner_id
      LEFT JOIN users u ON wr.seller_id = u.id
      ${whereClause}
      ORDER BY wr.created_at DESC
    `;
    
    const withdrawalsResult = await query(withdrawalsQuery);
    
    // Calculate totals
    const totalAmount = withdrawalsResult.rows.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
    const pendingAmount = withdrawalsResult.rows.filter(w => w.status === 'pending').reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
    const approvedAmount = withdrawalsResult.rows.filter(w => w.status === 'approved').reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
    
    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Withdrawals Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; }
          .summary p { margin: 5px 0; }
          .status-pending { color: #f59e0b; }
          .status-approved { color: #10b981; }
          .status-rejected { color: #ef4444; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Withdrawals Report</h1>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Store/Seller</th>
              <th>Amount</th>
              <th>Bank</th>
              <th>Account</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${withdrawalsResult.rows.map(w => `
              <tr>
                <td>${w.id}</td>
                <td>${w.store_name || w.seller_name || 'N/A'}</td>
                <td>Rs. ${parseFloat(w.amount || 0).toLocaleString()}</td>
                <td>${w.bank_name}</td>
                <td>${w.account_name} (${w.account_number})</td>
                <td class="status-${w.status}">${w.status}</td>
                <td>${new Date(w.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Total Amount:</strong> Rs. ${totalAmount.toLocaleString()}</p>
          <p><strong>Pending:</strong> Rs. ${pendingAmount.toLocaleString()}</p>
          <p><strong>Approved:</strong> Rs. ${approvedAmount.toLocaleString()}</p>
        </div>
        <script>window.print()</script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename=withdrawals.pdf.html');
    res.send(html);
  } catch (error) {
    console.error('Error exporting withdrawals PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getPlatformSettings,
  updateCommissionRate,
  getTransactions,
  getCommissionsBySeller,
  getWithdrawalRequests,
  createWithdrawalRequest,
  approveWithdrawal,
  rejectWithdrawal,
  exportTransactionsCSV,
  exportTransactionsPDF,
  exportWithdrawalsCSV,
  exportWithdrawalsPDF
};
