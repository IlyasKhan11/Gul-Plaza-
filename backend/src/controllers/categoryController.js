const { query } = require('../config/db');
const { body, param, validationResult } = require('express-validator');

// Validation rules for category creation
const createCategoryValidation = [
  body('name').notEmpty().isLength({ min: 1, max: 255 }).trim().escape(),
  body('slug').notEmpty().isLength({ min: 1, max: 255 }).trim().escape(),
  body('parent_id').optional().isInt({ min: 1 }),
];

// Validation rules for category update
const updateCategoryValidation = [
  body('name').optional().isLength({ min: 1, max: 255 }).trim().escape(),
  body('slug').optional().isLength({ min: 1, max: 255 }).trim().escape(),
  body('parent_id').optional().isInt({ min: 1 }),
];

// Validation rules for category ID parameter
const categoryIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
];

// Get all categories (with optional parent filtering)
const getAllCategories = async (req, res) => {
  try {
    const { parent_id } = req.query;
    
    let categoriesQuery = `
      SELECT 
        c.id, c.name, c.slug, c.parent_id, c.created_at, c.updated_at,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
    `;
    
    const params = [];
    
    if (parent_id) {
      categoriesQuery += ' WHERE c.parent_id = $1';
      params.push(parent_id);
    }
    
    categoriesQuery += ' ORDER BY c.name ASC';
    
    const categoriesResult = await query(categoriesQuery, params);
    
    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: categoriesResult.rows,
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    const categoryQuery = `
      SELECT 
        c.id, c.name, c.slug, c.parent_id, c.created_at, c.updated_at,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = $1
    `;
    
    const categoryResult = await query(categoryQuery, [categoryId]);
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    
    // Get subcategories of this category
    const subcategoriesQuery = `
      SELECT id, name, slug, created_at
      FROM categories
      WHERE parent_id = $1
      ORDER BY name ASC
    `;
    
    const subcategoriesResult = await query(subcategoriesQuery, [categoryId]);
    
    const category = categoryResult.rows[0];
    category.subcategories = subcategoriesResult.rows;
    
    res.status(200).json({
      success: true,
      message: 'Category retrieved successfully',
      data: category,
    });
  } catch (error) {
    console.error('Error getting category by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Create new category (Admin only)
const createCategory = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }
    
    const { name, slug, parent_id } = req.body;
    
    // Check if slug already exists
    const existingSlug = await query(
      'SELECT id FROM categories WHERE slug = $1',
      [slug]
    );
    
    if (existingSlug.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Category with this slug already exists',
      });
    }
    
    // If parent_id is provided, check if parent category exists
    if (parent_id) {
      const parentResult = await query(
        'SELECT id FROM categories WHERE id = $1',
        [parent_id]
      );
      
      if (parentResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found',
        });
      }
    }
    
    // Create category
    const createQuery = `
      INSERT INTO categories (name, slug, parent_id)
      VALUES ($1, $2, $3)
      RETURNING id, name, slug, parent_id, created_at, updated_at
    `;
    
    const newCategoryResult = await query(createQuery, [name, slug, parent_id || null]);
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategoryResult.rows[0],
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update category (Admin only)
const updateCategory = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }
    
    const categoryId = parseInt(req.params.id);
    const { name, slug, parent_id } = req.body;
    
    // Check if category exists
    const existingCategory = await query(
      'SELECT id FROM categories WHERE id = $1',
      [categoryId]
    );
    
    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    
    // Check if slug already exists (excluding current category)
    if (slug) {
      const existingSlug = await query(
        'SELECT id FROM categories WHERE slug = $1 AND id != $2',
        [slug, categoryId]
      );
      
      if (existingSlug.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Category with this slug already exists',
        });
      }
    }
    
    // If parent_id is provided, check if parent category exists and prevent circular reference
    if (parent_id) {
      if (parent_id === categoryId) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent',
        });
      }
      
      const parentResult = await query(
        'SELECT id FROM categories WHERE id = $1',
        [parent_id]
      );
      
      if (parentResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found',
        });
      }
    }
    
    // Update category
    const updateQuery = `
      UPDATE categories
      SET 
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        parent_id = COALESCE($3, parent_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, slug, parent_id, created_at, updated_at
    `;
    
    const updatedCategoryResult = await query(updateQuery, [
      name,
      slug,
      parent_id !== undefined ? parent_id : null,
      categoryId
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategoryResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete category (Admin only)
const deleteCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    // Check if category exists
    const existingCategory = await query(
      'SELECT id FROM categories WHERE id = $1',
      [categoryId]
    );
    
    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    
    // Check if category has subcategories
    const subcategoriesResult = await query(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1',
      [categoryId]
    );
    
    if (parseInt(subcategoriesResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories',
      });
    }
    
    // Check if category has products
    const productsResult = await query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
      [categoryId]
    );
    
    if (parseInt(productsResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with products',
      });
    }
    
    // Delete category
    await query('DELETE FROM categories WHERE id = $1', [categoryId]);
    
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  createCategoryValidation,
  updateCategoryValidation,
  categoryIdValidation,
};
