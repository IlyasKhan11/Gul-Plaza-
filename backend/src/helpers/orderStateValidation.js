/**
 * Order State Validation Helper
 * 
 * This module provides validation functions for order status transitions
 * according to the business rules defined for the manual payment system.
 */

const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  AWAITING_VERIFICATION: 'awaiting_verification',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const PAYMENT_METHODS = {
  COD: 'COD',
  EASYPaisa: 'EASYPaisa',
  DIRECT_SELLER: 'DIRECT_SELLER'
};

const PAYMENT_STATUSES = {
  PENDING: 'pending',
  VERIFIED: 'verified'
};

/**
 * Valid order status transitions
 * Key: current status, Value: array of allowed next statuses
 */
const VALID_TRANSITIONS = {
  [ORDER_STATUSES.PENDING]: [
    ORDER_STATUSES.CONFIRMED,      // For COD orders
    ORDER_STATUSES.AWAITING_VERIFICATION, // For Bank transfer orders
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.CONFIRMED]: [
    ORDER_STATUSES.SHIPPED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.AWAITING_VERIFICATION]: [
    ORDER_STATUSES.PAID  // After admin verification
  ],
  [ORDER_STATUSES.PAID]: [
    ORDER_STATUSES.SHIPPED
  ],
  [ORDER_STATUSES.SHIPPED]: [
    ORDER_STATUSES.DELIVERED
  ],
  [ORDER_STATUSES.CANCELLED]: [], // Final state
  [ORDER_STATUSES.DELIVERED]: []  // Final state
};

/**
 * Validates if an order status transition is allowed
 * @param {string} currentStatus - Current order status
 * @param {string} newStatus - New status to transition to
 * @param {string} paymentMethod - Payment method (optional, for additional validation)
 * @returns {boolean} - True if transition is valid
 */
const isValidStatusTransition = (currentStatus, newStatus, paymentMethod = null) => {
  // Normalize statuses to lowercase
  currentStatus = currentStatus?.toLowerCase();
  newStatus = newStatus?.toLowerCase();
  
  // Check if current status exists
  if (!currentStatus || !VALID_TRANSITIONS[currentStatus]) {
    return false;
  }
  
  // Check if new status is in allowed transitions
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    return false;
  }
  
  // Additional validation for payment-specific transitions
  if (currentStatus === ORDER_STATUSES.PENDING) {
    // If transitioning to CONFIRMED, payment method should be COD
    if (newStatus === ORDER_STATUSES.CONFIRMED && paymentMethod !== PAYMENT_METHODS.COD) {
      return false;
    }
    
    // If transitioning to AWAITING_VERIFICATION, payment method should be EASYPaisa
    if (newStatus === ORDER_STATUSES.AWAITING_VERIFICATION && paymentMethod !== PAYMENT_METHODS.EASYPaisa) {
      return false;
    }
    
    // If transitioning to AWAITING_VERIFICATION, payment method should be DIRECT_SELLER
    if (newStatus === ORDER_STATUSES.AWAITING_VERIFICATION && paymentMethod !== PAYMENT_METHODS.DIRECT_SELLER) {
      return false;
    }
  }
  
  return true;
};

/**
 * Determines the next status based on payment method selection
 * @param {string} paymentMethod - Selected payment method
 * @returns {string} - Next order status
 */
const getStatusAfterPaymentSelection = (paymentMethod) => {
  switch (paymentMethod?.toUpperCase()) {
    case PAYMENT_METHODS.COD:
      return ORDER_STATUSES.CONFIRMED;
    case PAYMENT_METHODS.EASYPaisa:
      return ORDER_STATUSES.AWAITING_VERIFICATION;
    case PAYMENT_METHODS.DIRECT_SELLER:
      return ORDER_STATUSES.AWAITING_VERIFICATION;
    default:
      throw new Error(`Invalid payment method: ${paymentMethod}`);
  }
};

/**
 * Validates payment method
 * @param {string} paymentMethod - Payment method to validate
 * @returns {boolean} - True if payment method is valid
 */
const isValidPaymentMethod = (paymentMethod) => {
  return Object.values(PAYMENT_METHODS).includes(paymentMethod?.toUpperCase());
};

/**
 * Validates payment status
 * @param {string} paymentStatus - Payment status to validate
 * @returns {boolean} - True if payment status is valid
 */
const isValidPaymentStatus = (paymentStatus) => {
  return Object.values(PAYMENT_STATUSES).includes(paymentStatus?.toLowerCase());
};

/**
 * Validates order status
 * @param {string} orderStatus - Order status to validate
 * @returns {boolean} - True if order status is valid
 */
const isValidOrderStatus = (orderStatus) => {
  return Object.values(ORDER_STATUSES).includes(orderStatus?.toLowerCase());
};

/**
 * Checks if an order can be cancelled
 * @param {string} currentStatus - Current order status
 * @returns {boolean} - True if order can be cancelled
 */
const canCancelOrder = (currentStatus) => {
  return currentStatus === ORDER_STATUSES.PENDING;
};

/**
 * Checks if payment can be verified for an order
 * @param {string} currentStatus - Current order status
 * @returns {boolean} - True if payment can be verified
 */
const canVerifyPayment = (currentStatus) => {
  return currentStatus === ORDER_STATUSES.AWAITING_VERIFICATION;
};

/**
 * Checks if an order can be shipped
 * @param {string} currentStatus - Current order status
 * @returns {boolean} - True if order can be shipped
 */
const canShipOrder = (currentStatus) => {
  return currentStatus === ORDER_STATUSES.PAID || currentStatus === ORDER_STATUSES.CONFIRMED;
};

/**
 * Gets all possible next statuses for a given current status
 * @param {string} currentStatus - Current order status
 * @returns {string[]} - Array of possible next statuses
 */
const getPossibleNextStatuses = (currentStatus) => {
  return VALID_TRANSITIONS[currentStatus] || [];
};

/**
 * Formats status for database storage (lowercase)
 * @param {string} status - Status to format
 * @returns {string} - Formatted status
 */
const formatStatus = (status) => {
  return status?.toLowerCase();
};

/**
 * Error messages for validation failures
 */
const VALIDATION_ERRORS = {
  INVALID_TRANSITION: (current, next) => 
    `Cannot change order status from ${current} to ${next}`,
  INVALID_PAYMENT_METHOD: (method) => 
    `Invalid payment method: ${method}. Allowed methods: ${Object.values(PAYMENT_METHODS).join(', ')}`,
  INVALID_PAYMENT_STATUS: (status) => 
    `Invalid payment status: ${status}. Allowed statuses: ${Object.values(PAYMENT_STATUSES).join(', ')}`,
  INVALID_ORDER_STATUS: (status) => 
    `Invalid order status: ${status}. Allowed statuses: ${Object.values(ORDER_STATUSES).join(', ')}`,
  ORDER_NOT_CANCELLABLE: (status) => 
    `Order with status ${status} cannot be cancelled. Only PENDING orders can be cancelled.`,
  PAYMENT_NOT_VERIFIABLE: (status) => 
    `Payment cannot be verified for order with status ${status}. Only AWAITING_VERIFICATION orders can be verified.`,
  ORDER_NOT_SHIPPABLE: (status) => 
    `Order with status ${status} cannot be shipped. Only PAID or CONFIRMED orders can be shipped.`,
  PAYMENT_METHOD_REQUIRED: 'Payment method is required for PENDING orders',
  ORDER_OWNERSHIP_REQUIRED: 'Order must belong to the user',
  ADMIN_ACCESS_REQUIRED: 'Admin access required for this operation',
  SELLER_ACCESS_REQUIRED: 'Seller access required for this operation'
};

module.exports = {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  VALID_TRANSITIONS,
  isValidStatusTransition,
  getStatusAfterPaymentSelection,
  isValidPaymentMethod,
  isValidPaymentStatus,
  isValidOrderStatus,
  canCancelOrder,
  canVerifyPayment,
  canShipOrder,
  getPossibleNextStatuses,
  formatStatus,
  VALIDATION_ERRORS
};
