const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { body, validationResult } = require('express-validator');
const { getCache, setCache } = require('../config/redis');

// Account lockout configuration
const LOCKOUT_THRESHOLD = 5; // Failed attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// Check if account is locked
const checkAccountLockout = async (email) => {
  const lockoutKey = `lockout_${email}`;
  const lockoutData = await getCache(lockoutKey);
  
  if (lockoutData) {
    const { attempts, lockUntil } = JSON.parse(lockoutData);
    
    if (lockUntil && Date.now() < lockUntil) {
      const remainingTime = Math.ceil((lockUntil - Date.now()) / 1000);
      return { 
        locked: true, 
        remainingTime,
        attempts 
      };
    }
  }
  
  return { locked: false };
};

// Increment failed login attempts
const incrementFailedAttempts = async (email) => {
  const lockoutKey = `lockout_${email}`;
  const lockoutData = await getCache(lockoutKey);
  
  let attempts = 1;
  let lockUntil = null;
  
  if (lockoutData) {
    const parsed = JSON.parse(lockoutData);
    attempts = parsed.attempts + 1;
  }
  
  if (attempts >= LOCKOUT_THRESHOLD) {
    lockUntil = Date.now() + LOCKOUT_DURATION;
  }
  
  await setCache(lockoutKey, JSON.stringify({
    attempts,
    lockUntil,
    lastAttempt: Date.now()
  }), LOCKOUT_DURATION / 1000);
  
  return { attempts, locked: attempts >= LOCKOUT_THRESHOLD };
};

// Generate public ID instead of exposing internal database ID
const generatePublicId = (internalId) => {
  return Buffer.from(`user_${internalId}_${process.env.PUBLIC_ID_SALT || 'secure'}`).toString('base64').replace(/[+/=]/g, '').substring(0, 12);
};

// Mask sensitive phone number
const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return phone;
  return phone.slice(0, 2) + '***' + phone.slice(-2);
};

// Create secure user response without sensitive data
const createSecureUserResponse = (user) => {
  return {
    publicId: generatePublicId(user.id), // Use public ID instead of internal ID
    name: user.name,
    email: user.email,
    phone: user.phone ? maskPhone(user.phone) : null, // Mask sensitive data
    role: user.role,
    is_verified: user.is_verified,
    created_at: user.created_at,
    // Internal ID removed for security
  };
};

// Reset failed login attempts on successful login
const resetFailedAttempts = async (email) => {
  const lockoutKey = `lockout_${email}`;
  await setCache(lockoutKey, JSON.stringify({
    attempts: 0,
    lockUntil: null,
    lastAttempt: Date.now()
  }), 1); // Very short TTL to effectively clear
};

// User registration with input validation and password hashing
const registerUser = async (req, res) => {
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

    const { name, email, password, phone, role = 'buyer' } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Hash password with bcrypt (salt rounds = 12 for security)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user into database
    const newUser = await query(
      `INSERT INTO users (name, email, password, phone, role, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, email, phone, role, is_verified, created_at`,
      [name, email, passwordHash, phone, role, false]
    );

    const user = newUser.rows[0];

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: createSecureUserResponse(user),
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
    });
  }
};

// User login with JWT token generation and account lockout
const loginUser = async (req, res) => {
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

    const { email, password } = req.body;

    // Check if account is locked
    const lockoutStatus = await checkAccountLockout(email);
    if (lockoutStatus.locked) {
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked due to too many failed attempts. Try again in ${lockoutStatus.remainingTime} seconds.`,
        lockoutInfo: {
          locked: true,
          remainingTime: lockoutStatus.remainingTime,
          attempts: lockoutStatus.attempts
        }
      });
    }

    // Find user by email
    const userResult = await query(
      'SELECT id, name, email, password, role, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Increment failed attempts for non-existent email
      await incrementFailedAttempts(email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = userResult.rows[0];

    // Compare provided password with stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed attempts for invalid password
      const attemptResult = await incrementFailedAttempts(email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        ...(attemptResult.locked && {
          lockoutWarning: `Account will be locked after ${LOCKOUT_THRESHOLD - attemptResult.attempts + 1} more failed attempts`
        })
      });
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(email);

    // Generate JWT token (expires in 1 hour)
    const tokenPayload = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '1h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: createSecureUserResponse(user),
        expiresIn: '1 hour',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
    });
  }
};

// Get current user profile (protected route)
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userResult = await query(
      'SELECT id, name, email, phone, role, is_verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        user: createSecureUserResponse(user),
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Validation rules for registration
const registerValidation = [
  body('name')
    .isLength({ min: 3, max: 255 })
    .withMessage('Name must be between 3 and 255 characters')
    .trim()
    .escape(),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('phone')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone must be between 10 and 20 characters')
    .trim()
    .escape(),
  
  body('role')
    .optional()
    .isIn(['buyer', 'seller', 'admin'])
    .withMessage('Role must be either buyer, seller, or admin'),
];

// Validation rules for login
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  registerValidation,
  loginValidation,
};
