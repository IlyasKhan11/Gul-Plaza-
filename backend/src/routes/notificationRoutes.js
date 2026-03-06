const express = require('express');
const jwt = require('jsonwebtoken');
const { requireAdmin } = require('../middleware/roleMiddleware');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Middleware to authenticate token from query param or header
const authenticateToken = (req, res, next) => {
  try {
    // Try to get token from query param first, then header
    let token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user information to request object
    req.user = {
      userId: decoded.userId,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    } else {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
};

// SSE endpoint for notifications
router.get('/sse', authenticateToken, requireAdmin, (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Add this client to the notification service
  const userId = req.user.role === 'admin' ? 'admin' : req.user.userId;
  notificationService.addClient(userId, res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ event: 'connected', data: { message: 'Connected to notifications' }, timestamp: new Date().toISOString() })}\n\n`);
  
  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);
  
  // Clean up on close
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Get notification events info
router.get('/events', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      events: Object.values(notificationService.NotificationEvents),
      connectedClients: notificationService.getConnectedCount()
    }
  });
});

module.exports = router;
