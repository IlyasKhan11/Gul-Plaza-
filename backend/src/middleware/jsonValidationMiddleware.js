const validateJSON = (req, res, next) => {
  const contentType = req.get('Content-Type');
  if (contentType && !contentType.includes('application/json')) {
    return res.status(400).json({
      success: false,
      message: 'Content-Type must be application/json',
      hint: 'Set Content-Type header to application/json'
    });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Request body cannot be empty',
      hint: 'Provide valid JSON data in request body'
    });
  }

  if (req.path.includes('/register')) {
    const requiredFields = ['name', 'email', 'password', 'phone'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields: missingFields,
        hint: 'Include all required fields in JSON body'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        field: 'email',
        value: req.body.email,
        hint: 'Provide a valid email address (e.g., user@example.com)'
      });
    }

    if (req.body.password && req.body.password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
        field: 'password',
        hint: 'Password should contain uppercase, lowercase, numbers, and special characters'
      });
    }

    const phoneRegex = /^[+]?[\d\s()-]+$/;
    if (!phoneRegex.test(req.body.phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        field: 'phone',
        value: req.body.phone,
        hint: 'Phone number should start with + and contain only digits, spaces, hyphens, and parentheses'
      });
    }
  }

  next();
};

module.exports = { validateJSON };
