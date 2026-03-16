const { query } = require('../config/db');
const { body, validationResult } = require('express-validator');
const notificationService = require('../services/notificationService');

// Validation rules for seller profile updates
const updateSellerProfileValidation = [
  body('first_name').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('last_name').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('phone').optional().isLength({ min: 10, max: 20 }).trim().escape(),
  body('address').optional().isLength({ max: 500 }).trim().escape(),
  body('city').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('country').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('postal_code').optional().isLength({ min: 3, max: 20 }).trim().escape(),
  body('avatar_url').optional().isURL().withMessage('Invalid URL format'),
  body('bio').optional().isLength({ max: 1000 }).trim().escape(),
  body('preferences').optional().custom(value => {
    if (typeof value === 'object' && value !== null) {
      return true;
    }
    throw new Error('Preferences must be a valid object');
  }),
];

// Validation rules for store creation
const createStoreValidation = [
  body('store_name').notEmpty().isLength({ min: 1, max: 100 }).trim().escape(),
  body('logo_url').optional().isURL().withMessage('Invalid URL format'),
  body('banner_url').optional().isURL().withMessage('Invalid URL format'),
  body('description').optional().isLength({ max: 2000 }).trim().escape(),
  body('contact_email').optional().isEmail().withMessage('Invalid email format'),
  body('contact_phone').optional().isLength({ min: 10, max: 20 }).trim().escape(),
  body('address').optional().isLength({ max: 500 }).trim().escape(),
  body('city').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('country').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('postal_code').optional().isLength({ min: 3, max: 20 }).trim().escape(),
  body('business_license').optional().isLength({ max: 100 }).trim().escape(),
  body('tax_id').optional().isLength({ max: 50 }).trim().escape(),
  body('store_settings').optional().custom(value => {
    if (typeof value === 'object' && value !== null) {
      return true;
    }
    throw new Error('Store settings must be a valid object');
  }),
];

// Validation rules for seller application
const applyForSellerValidation = [
  body('name').notEmpty().isLength({ min: 1, max: 100 }).trim().escape(),
  body('description').optional().isLength({ max: 2000 }).trim().escape(),
  body('contact_email').optional().isEmail().withMessage('Invalid email format'),
  body('contact_phone').optional().isLength({ min: 10, max: 20 }).trim().escape(),
  body('address').optional().isLength({ max: 500 }).trim().escape(),
  body('city').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('country').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('postal_code').optional().isLength({ min: 3, max: 20 }).trim().escape(),
  body('business_license').optional().isLength({ max: 100 }).trim().escape(),
  body('tax_id').optional().isLength({ max: 50 }).trim().escape(),
];

// Validation rules for store updates
const updateStoreValidation = [
  body('store_name').optional().isLength({ min: 1, max: 100 }).trim().escape(),
  body('logo_url').optional().isURL().withMessage('Invalid URL format'),
  body('banner_url').optional().isURL().withMessage('Invalid URL format'),
  body('description').optional().isLength({ max: 2000 }).trim().escape(),
  body('contact_email').optional().isEmail().withMessage('Invalid email format'),
  body('contact_phone').optional().isLength({ min: 10, max: 20 }).trim().escape(),
  body('address').optional().isLength({ max: 500 }).trim().escape(),
  body('city').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('country').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('postal_code').optional().isLength({ min: 3, max: 20 }).trim().escape(),
  body('business_license').optional().isLength({ max: 100 }).trim().escape(),
  body('tax_id').optional().isLength({ max: 50 }).trim().escape(),
  body('store_settings').optional().custom(value => {
    if (typeof value === 'object' && value !== null) {
      return true;
    }
    throw new Error('Store settings must be a valid object');
  }),
  body('is_active').optional().isBoolean(),
];

// Get seller profile
const getSellerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user basic information
    const userResult = await query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get user profile information
    const profileResult = await query(
      `SELECT first_name, last_name, phone, address, city, country, 
              postal_code, avatar_url, bio, preferences, created_at, updated_at 
       FROM user_profiles WHERE user_id = $1`,
      [userId]
    );

    // Get store information
    const storeResult = await query(
      `SELECT id, name, logo_url, banner_url, description, 
              contact_email, contact_phone, address, city, country, postal_code,
              business_license, tax_id, store_settings, is_active, is_approved, created_at, updated_at
       FROM stores WHERE owner_id = $1`,
      [userId]
    );

    const user = userResult.rows[0];
    const profile = profileResult.rows[0] || {};
    const store = storeResult.rows[0] || null;

    res.status(200).json({
      success: true,
      message: 'Seller profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        profile: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          country: profile.country,
          postal_code: profile.postal_code,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          preferences: profile.preferences || {},
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
        store: store ? {
          id: store.id,
          name: store.name,
          logo_url: store.logo_url,
          banner_url: store.banner_url,
          description: store.description,
          contact_email: store.contact_email,
          contact_phone: store.contact_phone,
          address: store.address,
          city: store.city,
          country: store.country,
          postal_code: store.postal_code,
          business_license: store.business_license,
          tax_id: store.tax_id,
          store_settings: store.store_settings || {},
          is_active: store.is_active,
          is_approved: store.is_approved,
          created_at: store.created_at,
          updated_at: store.updated_at,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error getting seller profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update seller profile
const updateSellerProfile = async (req, res) => {
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

    const userId = req.user.userId;
    const {
      first_name,
      last_name,
      phone,
      address,
      city,
      country,
      postal_code,
      avatar_url,
      bio,
      preferences,
    } = req.body;

    // Check if user exists
    const userResult = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if profile exists for this user
    const existingProfile = await query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    let profileResult;

    if (existingProfile.rows.length > 0) {
      // Update existing profile
      profileResult = await query(
        `UPDATE user_profiles 
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             phone = COALESCE($3, phone),
             address = COALESCE($4, address),
             city = COALESCE($5, city),
             country = COALESCE($6, country),
             postal_code = COALESCE($7, postal_code),
             avatar_url = COALESCE($8, avatar_url),
             bio = COALESCE($9, bio),
             preferences = COALESCE($10, preferences),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $11
         RETURNING *`,
        [
          first_name,
          last_name,
          phone,
          address,
          city,
          country,
          postal_code,
          avatar_url,
          bio,
          preferences ? JSON.stringify(preferences) : null,
          userId,
        ]
      );
    } else {
      // Create new profile
      profileResult = await query(
        `INSERT INTO user_profiles 
         (user_id, first_name, last_name, phone, address, city, country, 
          postal_code, avatar_url, bio, preferences)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          userId,
          first_name,
          last_name,
          phone,
          address,
          city,
          country,
          postal_code,
          avatar_url,
          bio,
          preferences ? JSON.stringify(preferences) : null,
        ]
      );
    }

    const updatedProfile = profileResult.rows[0];

    res.status(200).json({
      success: true,
      message: 'Seller profile updated successfully',
      data: {
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        phone: updatedProfile.phone,
        address: updatedProfile.address,
        city: updatedProfile.city,
        country: updatedProfile.country,
        postal_code: updatedProfile.postal_code,
        avatar_url: updatedProfile.avatar_url,
        bio: updatedProfile.bio,
        preferences: updatedProfile.preferences || {},
        updated_at: updatedProfile.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating seller profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Create store
const createStore = async (req, res) => {
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

    const userId = req.user.userId;
    const {
      store_name,
      logo_url,
      banner_url,
      description,
      contact_email,
      contact_phone,
      address,
      city,
      country,
      postal_code,
      business_license,
      tax_id,
      store_settings,
    } = req.body;

    // Check if store already exists for this seller
    const existingStore = await query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [userId]
    );
    if (existingStore.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Store already exists for this seller',
      });
    }

    // Create new store — seller is already approved, mark store active and approved
    const storeResult = await query(
      `INSERT INTO stores 
       (owner_id, name, logo_url, banner_url, description, 
        contact_email, contact_phone, address, city, country, postal_code,
        business_license, tax_id, store_settings, is_active, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, true)
       RETURNING *`,
      [
        userId,
        store_name,
        logo_url,
        banner_url,
        description,
        contact_email,
        contact_phone,
        address,
        city,
        country,
        postal_code,
        business_license,
        tax_id,
        store_settings ? JSON.stringify(store_settings) : null,
      ]
    );

    const newStore = storeResult.rows[0];

    // Notify admins — persist to DB + push SSE
    await notificationService.saveNotificationForAdmins(
      'approval',
      'New Seller Application',
      `${newStore.name} has submitted a store application and is awaiting your review.`,
      '/admin/sellers'
    );

    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      data: {
        id: newStore.id,
        name: newStore.name,
        logo_url: newStore.logo_url,
        banner_url: newStore.banner_url,
        description: newStore.description,
        contact_email: newStore.contact_email,
        contact_phone: newStore.contact_phone,
        address: newStore.address,
        city: newStore.city,
        country: newStore.country,
        postal_code: newStore.postal_code,
        business_license: newStore.business_license,
        tax_id: newStore.tax_id,
        store_settings: newStore.store_settings || {},
        is_active: newStore.is_active,
        created_at: newStore.created_at,
        updated_at: newStore.updated_at,
      },
    });
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update store
const updateStore = async (req, res) => {
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

    const userId = req.user.userId;
    const {
      store_name,
      logo_url,
      banner_url,
      description,
      contact_email,
      contact_phone,
      address,
      city,
      country,
      postal_code,
      business_license,
      tax_id,
      store_settings,
      is_active,
    } = req.body;

    // Check if store exists for this seller
    const existingStore = await query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [userId]
    );
    if (existingStore.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Update store
    const storeResult = await query(
      `UPDATE stores 
       SET name = COALESCE($1, name),
           logo_url = COALESCE($2, logo_url),
           banner_url = COALESCE($3, banner_url),
           description = COALESCE($4, description),
           contact_email = COALESCE($5, contact_email),
           contact_phone = COALESCE($6, contact_phone),
           address = COALESCE($7, address),
           city = COALESCE($8, city),
           country = COALESCE($9, country),
           postal_code = COALESCE($10, postal_code),
           business_license = COALESCE($11, business_license),
           tax_id = COALESCE($12, tax_id),
           store_settings = COALESCE($13, store_settings),
           is_active = COALESCE($14, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE owner_id = $15
       RETURNING *`,
      [
        store_name,
        logo_url,
        banner_url,
        description,
        contact_email,
        contact_phone,
        address,
        city,
        country,
        postal_code,
        business_license,
        tax_id,
        store_settings ? JSON.stringify(store_settings) : null,
        is_active,
        userId,
      ]
    );

    const updatedStore = storeResult.rows[0];

    res.status(200).json({
      success: true,
      message: 'Store updated successfully',
      data: {
        id: updatedStore.id,
        name: updatedStore.name,
        logo_url: updatedStore.logo_url,
        banner_url: updatedStore.banner_url,
        description: updatedStore.description,
        contact_email: updatedStore.contact_email,
        contact_phone: updatedStore.contact_phone,
        address: updatedStore.address,
        city: updatedStore.city,
        country: updatedStore.country,
        postal_code: updatedStore.postal_code,
        business_license: updatedStore.business_license,
        tax_id: updatedStore.tax_id,
        store_settings: updatedStore.store_settings || {},
        is_active: updatedStore.is_active,
        updated_at: updatedStore.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Apply to become a seller (create store application)
const applyForSeller = async (req, res) => {
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

    const userId = req.user.userId;
    const {
      name,
      description,
      contact_email,
      contact_phone,
      address,
      city,
      country,
      postal_code,
      business_license,
      tax_id,
    } = req.body;

    // Check if user exists and is a buyer
    const userResult = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (userResult.rows[0].role === 'seller') {
      return res.status(403).json({
        success: false,
        message: 'You are already a seller',
      });
    }
    
    if (userResult.rows[0].role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot apply to become sellers',
      });
    }

    // Check if user already has a pending or approved store application
    const existingStoreResult = await query(
      'SELECT id, name, is_active FROM stores WHERE owner_id = $1',
      [userId]
    );
    if (existingStoreResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already have a store application',
        data: {
          store: existingStoreResult.rows[0],
        },
      });
    }

    // Create store application (inactive by default, needs admin approval)
    const newStoreResult = await query(
      `INSERT INTO stores (owner_id, name, description, contact_email, contact_phone, address, city, country, postal_code, business_license, tax_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
       RETURNING id, name, description, contact_email, contact_phone, address, city, country, postal_code, business_license, tax_id, is_active, created_at`,
      [userId, name, description, contact_email, contact_phone, address, city, country, postal_code, business_license, tax_id]
    );

    const newStore = newStoreResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'Seller application submitted successfully. Your store will be reviewed by an admin.',
      data: {
        store: {
          id: newStore.id,
          name: newStore.name,
          description: newStore.description,
          contact_email: newStore.contact_email,
          contact_phone: newStore.contact_phone,
          address: newStore.address,
          city: newStore.city,
          country: newStore.country,
          postal_code: newStore.postal_code,
          business_license: newStore.business_license,
          tax_id: newStore.tax_id,
          is_active: newStore.is_active,
          created_at: newStore.created_at,
        },
      },
    });
  } catch (error) {
    console.error('Error applying for seller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Check if a buyer has a pending seller application
const checkApplication = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      `SELECT id, name, description, contact_email, contact_phone, is_active, is_approved, created_at
       FROM stores WHERE owner_id = $1 AND is_active = false AND is_approved = false`,
      [userId]
    );
    res.status(200).json({
      success: true,
      data: { application: result.rows[0] || null },
    });
  } catch (error) {
    console.error('Error checking application:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Withdraw a pending seller application (buyer only, not yet approved)
const withdrawApplication = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      `DELETE FROM stores WHERE owner_id = $1 AND is_active = false AND is_approved = false RETURNING id, name`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No pending application found to withdraw',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Seller application withdrawn successfully',
    });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get seller dashboard statistics
const getSellerDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get seller's store info
    const storeResult = await query(
      'SELECT id, name, is_active FROM stores WHERE owner_id = $1',
      [userId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Store not found. Please create a store first.',
      });
    }

    const store = storeResult.rows[0];

    // Get dashboard statistics
    const [
      totalProductsResult,
      activeProductsResult,
      totalOrdersResult,
      pendingOrdersResult,
      completedOrdersResult,
      totalRevenueResult,
      recentOrdersResult
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM products WHERE store_id = $1', [store.id]),
      query('SELECT COUNT(*) as count FROM products WHERE store_id = $1 AND is_active = true', [store.id]),
      query('SELECT COUNT(*) as count FROM orders WHERE seller_id = $1', [userId]),
      query('SELECT COUNT(*) as count FROM orders WHERE seller_id = $1 AND status = $2', [userId, 'pending']),
      query('SELECT COUNT(*) as count FROM orders WHERE seller_id = $1 AND status = $2', [userId, 'delivered']),
      query('SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE seller_id = $1 AND payment_status = $2', [userId, 'paid']),
      query(`
        SELECT o.id, o.total_amount, o.status, o.created_at, u.name as buyer_name
        FROM orders o
        JOIN users u ON o.buyer_id = u.id
        WHERE o.seller_id = $1
        ORDER BY o.created_at DESC
        LIMIT 5
      `, [userId])
    ]);

    const dashboardData = {
      store: {
        id: store.id,
        name: store.name,
        is_active: store.is_active,
      },
      statistics: {
        total_products: parseInt(totalProductsResult.rows[0].count),
        active_products: parseInt(activeProductsResult.rows[0].count),
        total_orders: parseInt(totalOrdersResult.rows[0].count),
        pending_orders: parseInt(pendingOrdersResult.rows[0].count),
        completed_orders: parseInt(completedOrdersResult.rows[0].count),
        total_revenue: parseFloat(totalRevenueResult.rows[0].revenue),
      },
      recent_orders: recentOrdersResult.rows.map(order => ({
        id: order.id,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at,
        buyer_name: order.buyer_name,
      })),
    };

    res.status(200).json({
      success: true,
      message: 'Seller dashboard data retrieved successfully',
      data: dashboardData,
    });
  } catch (error) {
    console.error('Error getting seller dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get a single store by ID (Public - no auth required)
const getPublicStoreById = async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid store ID' });
    }

    const result = await query(
      `SELECT s.id, s.owner_id, s.name, s.logo_url, s.banner_url, s.description,
              s.contact_email, s.contact_phone, s.city, s.country,
              COUNT(p.id) FILTER (WHERE p.is_active = true) AS product_count
       FROM stores s
       LEFT JOIN products p ON p.store_id = s.id
       WHERE s.id = $1 AND s.is_active = true
       GROUP BY s.id`,
      [storeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const s = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: s.id,
        owner_id: s.owner_id,
        name: s.name,
        logo_url: s.logo_url,
        banner_url: s.banner_url,
        description: s.description,
        contact_email: s.contact_email,
        contact_phone: s.contact_phone,
        city: s.city,
        country: s.country,
        product_count: parseInt(s.product_count) || 0,
      },
    });
  } catch (error) {
    console.error('Error getting store by ID:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get public list of active stores (Public - no auth required)
const getPublicStores = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);

    const result = await query(
      `SELECT s.id, s.owner_id, s.name, s.logo_url, s.banner_url, s.description,
              COUNT(p.id) FILTER (WHERE p.is_active = true) AS product_count
       FROM stores s
       LEFT JOIN products p ON p.store_id = s.id
       WHERE s.is_active = true
       GROUP BY s.id
       ORDER BY product_count DESC
       LIMIT $1`,
      [limit]
    );

    const stores = result.rows.map(s => ({
      id: s.id,
      owner_id: s.owner_id,
      name: s.name,
      logo_url: s.logo_url,
      banner_url: s.banner_url,
      description: s.description,
      product_count: parseInt(s.product_count) || 0,
    }));

    res.status(200).json({ success: true, data: stores });
  } catch (error) {
    console.error('Error getting public stores:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get Store Contact Info (Public - no auth required)
// Used by checkout to show seller's EasyPaisa/contact number
const getStoreContactInfo = async (req, res) => {
  try {
    const sellerId = parseInt(req.params.sellerId);

    const storeResult = await query(
      `SELECT s.name, s.contact_phone, s.contact_email, u.phone as owner_phone
       FROM stores s
       LEFT JOIN users u ON s.owner_id = u.id
       WHERE s.owner_id = $1 AND s.is_active = true`,
      [sellerId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    const store = storeResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        store_name: store.name,
        contact_phone: store.contact_phone || store.owner_phone || null,
        contact_email: store.contact_email || null,
      },
    });
  } catch (error) {
    console.error('Error getting store contact info:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getSellerProfile,
  updateSellerProfile,
  createStore,
  updateStore,
  applyForSeller,
  checkApplication,
  withdrawApplication,
  getSellerDashboard,
  getPublicStores,
  getPublicStoreById,
  getStoreContactInfo,
  updateSellerProfileValidation,
  createStoreValidation,
  updateStoreValidation,
  applyForSellerValidation,
};
