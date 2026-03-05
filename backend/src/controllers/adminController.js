const { query } = require('../config/db');
const { body, param, validationResult } = require('express-validator');

// Validation rules for user blocking/unblocking
const blockUserValidation = [
  param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
];

// Get all users with pagination and filtering
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query;

    // Convert and validate pagination parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 100); // Max 100 users per page

    // Build WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Validate sort column (users table uses 'name', not 'name')
    const allowedSortColumns = ['id', 'name', 'email', 'role', 'created_at', 'updated_at'];
    const sortColumn = allowedSortColumns.includes(sortBy) && sortBy !== 'name' ? sortBy : 'created_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build the main query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const usersQuery = `
      SELECT
        u.id, u.name as name, u.email, u.role,
        COALESCE(up.phone, u.phone) as phone,
        u.created_at, u.updated_at,
        CASE WHEN s.id IS NOT NULL THEN true ELSE false END as has_store,
        s.name as store_name,
        CASE WHEN ub.id IS NOT NULL THEN true ELSE false END as is_blocked
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN stores s ON u.id = s.owner_id
      LEFT JOIN user_blocks ub ON u.id = ub.user_id AND ub.is_active = true
      ${whereClause}
      ORDER BY u.${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parsedLimit, offset);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;

    const countParams = params.slice(0, -2); // Remove limit and offset for count

    // Execute both queries
    const [usersResult, countResult] = await Promise.all([
      query(usersQuery, params),
      query(countQuery, countParams),
    ]);

    const totalUsers = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalUsers / parsedLimit);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: usersResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_users: totalUsers,
          users_per_page: parsedLimit,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
        filters: {
          role,
          search,
          sort_by: sortColumn,
          sort_order: sortDirection,
        },
      },
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Block user
const blockUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const userId = parseInt(req.params.id);
    const adminId = req.user.userId;

    // Check if user exists
    const userResult = await query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const targetUser = userResult.rows[0];

    // Prevent admin from blocking themselves
    if (userId === adminId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block yourself',
      });
    }

    // Check if user is already blocked
    const existingBlock = await query(
      'SELECT id FROM user_blocks WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    if (existingBlock.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User is already blocked',
      });
    }

    // Block user
    const blockResult = await query(
      `INSERT INTO user_blocks (user_id, blocked_by, reason)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [userId, adminId, req.body.reason || null]
    );

    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      data: {
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
        },
        block_info: {
          block_id: blockResult.rows[0].id,
          blocked_at: blockResult.rows[0].created_at,
          blocked_by: adminId,
        },
      },
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Unblock user
const unblockUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const userId = parseInt(req.params.id);
    const adminId = req.user.userId;

    // Check if user exists
    const userResult = await query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const targetUser = userResult.rows[0];

    // Check if user is currently blocked
    const existingBlock = await query(
      'SELECT id, blocked_by FROM user_blocks WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    if (existingBlock.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'User is not currently blocked',
      });
    }

    // Unblock the user
    const unblockResult = await query(
      `UPDATE user_blocks 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_active = true
       RETURNING id, updated_at`,
      [userId]
    );

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully',
      data: {
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
        },
        unblock_info: {
          block_id: existingBlock.rows[0].id,
          unblocked_at: unblockResult.rows[0].updated_at,
          unblocked_by: adminId,
        },
      },
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get user details by ID
const getUserById = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Get user details with profile and store information
    const userQuery = `
      SELECT 
        u.id, u.name, u.email, u.role, u.created_at, u.updated_at,
        up.first_name, up.last_name, up.phone, up.address, up.city, 
        up.country, up.postal_code, up.avatar_url, up.bio,
        s.id as store_id, s.name as store_name, s.logo_url, s.banner_url, 
        s.description, s.contact_email, s.contact_phone, s.is_active as store_active,
        CASE WHEN ub.id IS NOT NULL AND ub.is_active = true THEN true ELSE false END as is_blocked,
        ub.created_at as blocked_at, ub.blocked_by, ub.reason as block_reason
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN stores s ON u.id = s.owner_id
      LEFT JOIN user_blocks ub ON u.id = ub.user_id AND ub.is_active = true
      WHERE u.id = $1
    `;

    const userResult = await query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Format the response
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
      profile: {
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        address: user.address,
        city: user.city,
        country: user.country,
        postal_code: user.postal_code,
        avatar_url: user.avatar_url,
        bio: user.bio,
      },
      store: user.store_id ? {
        id: user.store_id,
        store_name: user.store_name,
        logo_url: user.logo_url,
        banner_url: user.banner_url,
        description: user.description,
        contact_email: user.contact_email,
        contact_phone: user.contact_phone,
        is_active: user.store_active,
      } : null,
      is_blocked: user.is_blocked,
      block_info: user.is_blocked ? {
        blocked_at: user.blocked_at,
        blocked_by: user.blocked_by,
        reason: user.block_reason,
      } : null,
    };

    res.status(200).json({
      success: true,
      message: 'User details retrieved successfully',
      data: userData,
    });
  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get seller applications for admin approval
const getSellerApplications = async (req, res) => {
  try {
    const result = await query(`
      SELECT s.*, u.name as owner_name, u.email as owner_email
      FROM stores s
      JOIN users u ON s.owner_id = u.id
      WHERE s.is_active = false
      ORDER BY s.created_at DESC
    `);

    res.status(200).json({
      success: true,
      message: 'Seller applications retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error getting seller applications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Approve seller application
const approveSellerApplication = async (req, res) => {
  try {
    const { storeId } = req.params;

    // Get store and user info
    const storeResult = await query(
      'SELECT s.*, u.id as user_id FROM stores s JOIN users u ON s.owner_id = u.id WHERE s.id = $1',
      [storeId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Store application not found',
      });
    }

    const store = storeResult.rows[0];

    // Start transaction
    await query('BEGIN');

    try {
      // Activate the store
      await query(
        'UPDATE stores SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [storeId]
      );

      // Update user role to seller
      await query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['seller', store.user_id]
      );

      await query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Seller application approved successfully',
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error approving seller application:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Reject seller application
const rejectSellerApplication = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { reason } = req.body;

    // Delete the store application
    const result = await query(
      'DELETE FROM stores WHERE id = $1 AND is_active = false RETURNING *',
      [storeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Store application not found or already processed',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Seller application rejected successfully',
      data: {
        reason: reason || 'Application rejected by admin',
      },
    });
  } catch (error) {
    console.error('Error rejecting seller application:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getAllUsers,
  blockUser,
  unblockUser,
  getUserById,
  getSellerApplications,
  approveSellerApplication,
  rejectSellerApplication,
  blockUserValidation,
};
