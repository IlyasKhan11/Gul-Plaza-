// Notification Service for real-time notifications
// Uses Server-Sent Events (SSE) for push + DB for persistence

const { query } = require('../config/db');

// Store active SSE connections
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

// Add a new SSE client connection
function addClient(userId, res, role = 'buyer') {
  const clientId = `${userId}_${Date.now()}`;
  clients.set(clientId, { userId, role, res });

  res.on('close', () => {
    clients.delete(clientId);
  });

  return clientId;
}

// Save notification to DB and push via SSE
async function saveNotification(userId, type, title, message, link = null) {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, type, title, message, link, is_read, created_at`,
      [userId, type, title, message, link]
    );
    const notification = result.rows[0];

    // Push via SSE to the user if connected
    pushToUser(String(userId), 'notification', notification);

    return notification;
  } catch (err) {
    console.error('Failed to save notification:', err);
  }
}

// Push SSE event to a specific user (by userId string)
function pushToUser(userId, event, data) {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  clients.forEach((client) => {
    if (String(client.userId) === String(userId)) {
      client.res.write(`data: ${payload}\n\n`);
    }
  });
}

// Send notification to specific user (SSE only, legacy)
function sendToUser(userId, event, data) {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  clients.forEach((client) => {
    if (String(client.userId) === String(userId) || client.userId === 'admin') {
      client.res.write(`data: ${payload}\n\n`);
    }
  });
}

// Send notification to all admins (SSE only)
function sendToAdmins(event, data) {
  clients.forEach((client) => {
    if (client.userId === 'admin') {
      const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
      client.res.write(`data: ${payload}\n\n`);
    }
  });
}

// Broadcast to all connected clients (SSE only)
function broadcast(event, data) {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  clients.forEach((client) => {
    client.res.write(`data: ${payload}\n\n`);
  });
}

// Notify all buyers — batch insert to DB + push SSE to connected buyers
async function notifyAllBuyers(type, title, message, link = null) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       SELECT id, $1, $2, $3, $4 FROM users WHERE role = 'buyer'`,
      [type, title, message, link]
    );
    const payload = JSON.stringify({
      event: 'notification',
      data: { type, title, message, link, is_read: false, created_at: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
    clients.forEach((client) => {
      if (client.role === 'buyer') {
        client.res.write(`data: ${payload}\n\n`);
      }
    });
  } catch (err) {
    console.error('Failed to notify all buyers:', err);
  }
}

// Save notification to DB for all admins + push SSE to connected admins
async function saveNotificationForAdmins(type, title, message, link = null) {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       SELECT id, $1, $2, $3, $4 FROM users WHERE role = 'admin'
       RETURNING id, user_id, type, title, message, link, is_read, created_at`,
      [type, title, message, link]
    );
    const payload = JSON.stringify({
      event: 'notification',
      data: { type, title, message, link, is_read: false, created_at: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
    clients.forEach((client) => {
      if (client.userId === 'admin') {
        client.res.write(`data: ${payload}\n\n`);
      }
    });
    return result.rows;
  } catch (err) {
    console.error('Failed to save admin notifications:', err);
  }
}

// Get connected client count
function getConnectedCount() {
  return clients.size;
}

module.exports = {
  NotificationEvents,
  addClient,
  saveNotification,
  saveNotificationForAdmins,
  sendToUser,
  sendToAdmins,
  broadcast,
  notifyAllBuyers,
  getConnectedCount,
};
