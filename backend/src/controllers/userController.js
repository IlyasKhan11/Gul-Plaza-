const { query } = require('../config/db');
const { body, validationResult } = require('express-validator');

// Validation rules for user profile updates
const updateProfileValidation = [
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

// Get logged-in buyer profile
const getBuyerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user basic information
    const userResult = await query(
      'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = $1',
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

    const user = userResult.rows[0];
    const profile = profileResult.rows[0] || {};

    res.status(200).json({
      success: true,
      message: 'Buyer profile retrieved successfully',
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
      },
    });
  } catch (error) {
    console.error('Error getting buyer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update buyer profile
const updateBuyerProfile = async (req, res) => {
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
    const userIdResult = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userIdResult.rows.length === 0) {
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

      // Get user basic info from users table
      const userInfoResult = await query(
        'SELECT id, name, email, role, phone, address, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );
      const user = userInfoResult.rows[0];

      // Compose user object for frontend
      res.status(200).json({
        success: true,
        message: 'Buyer profile updated successfully',
        data: {
          user: {
            publicId: user.id, // frontend expects publicId
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            address: user.address,
            city: updatedProfile.city,
            country: updatedProfile.country,
            postal_code: updatedProfile.postal_code,
            avatar_url: updatedProfile.avatar_url,
            bio: updatedProfile.bio,
            preferences: updatedProfile.preferences || {},
            created_at: user.created_at,
            updated_at: user.updated_at,
          }
        }
      });
  } catch (error) {
    console.error('Error updating buyer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getBuyerProfile,
  updateBuyerProfile,
  updateProfileValidation,
};
