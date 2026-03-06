const { query } = require('../config/db');

// Add product to wishlist
const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = parseInt(req.params.productId);

    if (!productId || isNaN(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const productResult = await query(
      'SELECT id FROM products WHERE id = $1 AND is_active = true AND is_deleted = false',
      [productId]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await query(
      'INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, productId]
    );

    res.status(200).json({ success: true, message: 'Product saved to wishlist' });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = parseInt(req.params.productId);

    await query(
      'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    res.status(200).json({ success: true, message: 'Product removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get buyer's wishlist
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT
        w.id as wishlist_id,
        w.created_at as saved_at,
        p.id,
        p.title,
        p.price,
        p.stock,
        p.is_active,
        s.name as store_name,
        s.id as store_id,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as primary_image
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      JOIN stores s ON p.store_id = s.id
      WHERE w.user_id = $1 AND p.is_deleted = false
      ORDER BY w.created_at DESC`,
      [userId]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting wishlist:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Check if a product is in wishlist
const checkWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = parseInt(req.params.productId);

    const result = await query(
      'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    res.status(200).json({ success: true, data: { saved: result.rows.length > 0 } });
  } catch (error) {
    console.error('Error checking wishlist:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { addToWishlist, removeFromWishlist, getWishlist, checkWishlist };
