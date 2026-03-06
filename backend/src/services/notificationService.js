// Notification Service for real-time admin notifications
// Uses Server-Sent Events (SSE) for push notifications

// Store active connections
const clients = new Map();

// Event types
const NotificationEvents = {
  NEW_ORDER: 'new_order',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  NEW_SELLER_APPLICATION: 'new_seller_application',
  SELLER_APPLICATION_APPROVED: 'seller_application_approved',
  SELLER_APPLICATION_REJECTED: 'seller_application_rejected',
  NEW_WITHDRAWAL_REQUEST: 'new_withdrawal_request',
  WITHDRAWAL_APPROVED: 'withdrawal_approved',
  WITHDRAWAL_REJECTED: 'withdrawal_rejected',
  NEW_REPORT: 'new_report',
  REPORT_STATUS_CHANGED: 'report_status_changed',
  NEW_USER: 'new_user',
  LOW_STOCK_ALERT: 'low_stock_alert',
};

// Add a new client connection
function addClient(userId, res) {
  const clientId = `${userId}_${Date.now()}`;
  clients.set(clientId, { userId, res });
  
  // Remove client on close
  res.on('close', () => {
    clients.delete(clientId);
  });
  
  return clientId;
}

// Send notification to specific user
function sendToUser(userId, event, data) {
  clients.forEach((client, clientId) => {
    if (client.userId === userId || client.userId === 'admin') {
      const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
      client.res.write(`data: ${payload}\n\n`);
    }
  });
}

// Send notification to all admins
function sendToAdmins(event, data) {
  clients.forEach((client, clientId) => {
    if (client.userId === 'admin') {
      const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
      client.res.write(`data: ${payload}\n\n`);
    }
  });
}

// Send notification to all connected clients
function broadcast(event, data) {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  clients.forEach((client) => {
    client.res.write(`data: ${payload}\n\n`);
  });
}

// Get connected client count
function getConnectedCount() {
  return clients.size;
}

module.exports = {
  NotificationEvents,
  addClient,
  sendToUser,
  sendToAdmins,
  broadcast,
  getConnectedCount,
};
