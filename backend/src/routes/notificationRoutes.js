const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAnyRole } = require('../middleware/roleMiddleware');
const notificationService = require('../services/notificationService');
const { query } = require('../config/db');

const router = express.Router();

// Special auth for SSE — EventSource cannot send headers, so accept token from query param
function authenticateSSE(req, res, next) {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// SSE endpoint — all authenticated users (buyer, seller, admin)
router.get('/sse', authenticateSSE, requireAnyRole, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const userId = req.user.role === 'admin' ? 'admin' : req.user.userId;
  notificationService.addClient(userId, res, req.user.role);

  res.write(`data: ${JSON.stringify({ event: 'connected', data: { message: 'Connected to notifications' }, timestamp: new Date().toISOString() })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// GET /api/notifications — get current user's notifications (latest 50)
router.get('/', authenticateToken, requireAnyRole, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      `SELECT id, type, title, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    const unreadCount = result.rows.filter(n => !n.is_read).length;
    res.status(200).json({
      success: true,
      data: { notifications: result.rows, unread_count: unreadCount },
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/notifications/read-all — mark all as read (must be before /:id/read)
router.put('/read-all', authenticateToken, requireAnyRole, async (req, res) => {
  try {
    const userId = req.user.userId;
    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/notifications/:id/read — mark single notification as read
router.put('/:id/read', authenticateToken, requireAnyRole, async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id);
    await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/notifications/events — info endpoint
router.get('/events', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      events: Object.values(notificationService.NotificationEvents),
      connectedClients: notificationService.getConnectedCount(),
    },
  });
});

module.exports = router;
