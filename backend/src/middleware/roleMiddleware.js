// Role-based access control middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Current role: ${req.user.role}`,
      });
    }

    next();
  };
};

// Specific role middleware functions for common use cases
const requireBuyer = authorizeRoles('buyer');
const requireSeller = authorizeRoles('seller');
const requireAdmin = authorizeRoles('admin');
const requireSellerOrAdmin = authorizeRoles('seller', 'admin');
const requireBuyerOrSeller = authorizeRoles('buyer', 'seller');
const requireAnyRole = authorizeRoles('buyer', 'seller', 'admin');

// Middleware to check if user can access their own resources or has admin privileges
const requireOwnershipOrAdmin = (getUserIdFromParams = (req) => req.params.userId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const resourceUserId = parseInt(getUserIdFromParams(req));
    const currentUserId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    // Allow access if user is admin or accessing their own resources
    if (isAdmin || currentUserId === resourceUserId) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources or need admin privileges',
      });
    }
  };
};

// Middleware to check if user can modify resources (owner, seller for their products, or admin)
const requireModifyAccess = (getResourceOwnerId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;
    const resourceOwnerId = getResourceOwnerId(req);

    // Admin can modify anything
    if (currentUserRole === 'admin') {
      return next();
    }

    // Owner can modify their own resources
    if (currentUserId === resourceOwnerId) {
      return next();
    }

    // Sellers can modify their products (this would need additional logic for product ownership)
    if (currentUserRole === 'seller') {
      // Additional product-specific logic would go here
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions to modify this resource',
    });
  };
};

module.exports = {
  authorizeRoles,
  requireBuyer,
  requireSeller,
  requireAdmin,
  requireSellerOrAdmin,
  requireBuyerOrSeller,
  requireAnyRole,
  requireOwnershipOrAdmin,
  requireModifyAccess,
};
