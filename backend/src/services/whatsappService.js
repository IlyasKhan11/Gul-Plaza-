/**
 * WhatsApp Notification Service
 * 
 * This service handles sending WhatsApp notifications for order updates.
 * In production, this would integrate with WhatsApp Business API.
 * For now, it provides a mock implementation that logs messages.
 */

class WhatsAppService {
  constructor() {
    // In production, these would be environment variables
    this.apiToken = process.env.WHATSAPP_API_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Send WhatsApp message
   * @param {string} to - Recipient phone number (with country code)
   * @param {string} message - Message content
   * @param {string} type - Message type ('text' or 'template')
   * @returns {Promise<Object>} - API response
   */
  async sendMessage(to, message, type = 'text') {
    try {
      // In development, just log the message
      if (process.env.NODE_ENV !== 'production') {
        console.log('📱 WhatsApp Message (Development Mode):', {
          to,
          message,
          type,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          messageId: `mock_${Date.now()}`,
          status: 'sent'
        };
      }

      // Production implementation with WhatsApp Business API
      const payload = {
        messaging_product: 'whatsapp',
        to: to.replace(/[^\d]/g, ''), // Remove non-digit characters
        type: type
      };

      if (type === 'text') {
        payload.text = { body: message };
      } else if (type === 'template') {
        payload.template = message;
      }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${data.error?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        messageId: data.messages[0].id,
        status: 'sent'
      };

    } catch (error) {
      console.error('WhatsApp service error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send order confirmation message to buyer
   * @param {Object} order - Order object
   * @param {Object} buyer - Buyer user object
   * @returns {Promise<Object>} - Send result
   */
  async sendOrderConfirmation(order, buyer) {
    const message = `🎉 Order Confirmed!\n\n` +
      `Order #${order.id}\n` +
      `Total: $${order.total_amount}\n` +
      `Payment Method: ${order.payment_method?.toUpperCase() || 'COD'}\n\n` +
      `Your order has been confirmed and will be shipped soon.\n` +
      `Thank you for shopping with us!`;

    return this.sendMessage(buyer.phone, message);
  }

  /**
   * Send order shipped message to buyer
   * @param {Object} order - Order object with tracking info
   * @param {Object} buyer - Buyer user object
   * @returns {Promise<Object>} - Send result
   */
  async sendOrderShipped(order, buyer) {
    const message = `📦 Order Shipped!\n\n` +
      `Order #${order.id}\n` +
      `Courier: ${order.courier_name}\n` +
      `Tracking Number: ${order.tracking_number}\n\n` +
      `Your order is on its way! Track your package using the tracking number above.\n` +
      `Expected delivery: 3-5 business days`;

    return this.sendMessage(buyer.phone, message);
  }

  /**
   * Send new order notification to seller
   * @param {Object} order - Order object
   * @param {Object} seller - Seller user object
   * @param {Array} items - Order items
   * @returns {Promise<Object>} - Send result
   */
  async sendNewOrderToSeller(order, seller, items) {
    const itemsList = items.map(item => 
      `• ${item.title} (Qty: ${item.quantity})`
    ).join('\n');

    const message = `🛒 New Order Received!\n\n` +
      `Order #${order.id}\n` +
      `Customer: ${order.buyer_name || 'N/A'}\n` +
      `Total: $${order.total_amount}\n` +
      `Payment: ${order.payment_method?.toUpperCase() || 'COD'}\n\n` +
      `Items:\n${itemsList}\n\n` +
      `Please confirm the order and arrange shipping.`;

    return this.sendMessage(seller.phone, message);
  }

  /**
   * Send order delivered message to buyer
   * @param {Object} order - Order object
   * @param {Object} buyer - Buyer user object
   * @returns {Promise<Object>} - Send result
   */
  async sendOrderDelivered(order, buyer) {
    const message = `✅ Order Delivered!\n\n` +
      `Order #${order.id}\n` +
      `Total: $${order.total_amount}\n\n` +
      `Your order has been successfully delivered.\n` +
      `Thank you for shopping with us! Please leave a review.`;

    return this.sendMessage(buyer.phone, message);
  }

  /**
   * Send custom message to user
   * @param {string} to - Recipient phone number
   * @param {string} message - Custom message content
   * @returns {Promise<Object>} - Send result
   */
  async sendCustomMessage(to, message) {
    return this.sendMessage(to, message);
  }

  /**
   * Send order cancellation notification
   * @param {Object} order - Order object
   * @param {Object} user - User object (buyer or seller)
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} - Send result
   */
  async sendOrderCancelled(order, user, reason = 'No reason provided') {
    const message = `❌ Order Cancelled\n\n` +
      `Order #${order.id}\n` +
      `Total: $${order.total_amount}\n` +
      `Reason: ${reason}\n\n` +
      `The order has been cancelled. If you have any questions, please contact support.`;

    return this.sendMessage(user.phone, message);
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} - True if valid
   */
  validatePhoneNumber(phone) {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/[^\d]/g, '');
    
    // Check if it's a valid international number (8-15 digits)
    return cleanPhone.length >= 8 && cleanPhone.length <= 15;
  }

  /**
   * Format phone number for WhatsApp
   * @param {string} phone - Phone number
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phone) {
    let cleanPhone = phone.replace(/[^\d]/g, '');
    
    // Add country code if not present (assuming Pakistan +92 by default)
    if (!cleanPhone.startsWith('92') && cleanPhone.length === 10) {
      cleanPhone = '92' + cleanPhone;
    }
    
    // Remove leading 0 if present after country code
    if (cleanPhone.startsWith('920')) {
      cleanPhone = '92' + cleanPhone.substring(3);
    }
    
    return cleanPhone;
  }
}

module.exports = new WhatsAppService();
