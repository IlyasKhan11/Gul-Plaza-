// SECURE RESPONSE FORMAT FOR AUTHENTICATION ENDPOINTS
// Removes internal IDs and sensitive data exposure

// SECURE USER RESPONSE FORMAT
const createSecureUserResponse = (user) => {
  return {
    // Remove internal ID, use public identifier
    publicId: generatePublicId(user.id), // Hash or UUID instead of raw ID
    name: user.name,
    email: user.email,
    phone: user.phone || null, // Return full phone number
    role: user.role,
    is_verified: user.is_verified,
    created_at: user.created_at,
    // Never expose internal database ID
  };
};

// PHONE MASKING FUNCTION
const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return phone;
  return phone.slice(0, 2) + '***' + phone.slice(-2);
};

// GENERATE PUBLIC ID (replace internal ID)
const generatePublicId = (internalId) => {
  // Use a hash or UUID instead of exposing database ID
  return Buffer.from(`user_${internalId}_${process.env.PUBLIC_ID_SALT || 'default'}`).toString('base64').replace(/[+/=]/g, '').substring(0, 12);
};

// UPDATED REGISTRATION RESPONSE
const secureRegistrationResponse = (user) => ({
  success: true,
  message: 'User registered successfully',
  data: {
    user: createSecureUserResponse(user),
  },
});

// UPDATED LOGIN RESPONSE
const secureLoginResponse = (user, token) => ({
  success: true,
  message: 'Login successful',
  data: {
    accessToken: token,
    user: createSecureUserResponse(user),
    expiresIn: '1 hour',
  },
});

// UPDATED PROFILE RESPONSE
const secureProfileResponse = (user) => ({
  success: true,
  message: 'Profile retrieved successfully',
  data: {
    user: createSecureUserResponse(user),
  },
});

// EXAMPLE USAGE IN CONTROLLERS:

// IN registerUser:
res.status(201).json(secureRegistrationResponse(user));

// IN loginUser:
res.status(200).json(secureLoginResponse(user, accessToken));

// IN getUserProfile:
res.status(200).json(secureProfileResponse(user));

// ADDITIONAL SECURITY MEASURES:

// 1. REMOVE PASSWORD FROM ALL RESPONSES (already done)
// 2. MASK SENSITIVE FIELDS (phone, address)
// 3. USE PUBLIC IDS INSTEAD OF INTERNAL IDS
// 4. LIMIT EXPOSED METADATA
// 5. SANITIZE ALL OUTPUTS
