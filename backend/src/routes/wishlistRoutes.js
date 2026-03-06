const express = require('express');
const { addToWishlist, removeFromWishlist, getWishlist, checkWishlist } = require('../controllers/wishlistController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireBuyer } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authenticateToken, requireBuyer, getWishlist);
router.get('/:productId/check', authenticateToken, requireBuyer, checkWishlist);
router.post('/:productId', authenticateToken, requireBuyer, addToWishlist);
router.delete('/:productId', authenticateToken, requireBuyer, removeFromWishlist);

module.exports = router;
