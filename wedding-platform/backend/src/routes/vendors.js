const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireVendor, requireAdmin, requireVendorOrAdmin } = require('../middleware/auth');
const { validateVendorProfile, validateUUID } = require('../middleware/validation');

const router = express.Router();

// Get all vendors (public) - with search and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      city, 
      search, 
      verified, 
      page = 1, 
      limit = 20,
      sortBy = 'rating',
      sortOrder = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        vp.id,
        vp.business_name,
        vp.description,
        vp.category,
        vp.city,
        vp.rating,
        vp.review_count,
        vp.is_verified,
        vp.created_at,
        u.first_name,
        u.last_name,
        u.email
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      WHERE u.is_active = true
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Add filters
    if (category) {
      paramCount++;
      query += ` AND vp.category ILIKE $${paramCount}`;
      queryParams.push(`%${category}%`);
    }

    if (city) {
      paramCount++;
      query += ` AND vp.city ILIKE $${paramCount}`;
      queryParams.push(`%${city}%`);
    }

    if (search) {
      paramCount++;
      query += ` AND (vp.business_name ILIKE $${paramCount} OR vp.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (verified !== undefined) {
      paramCount++;
      query += ` AND vp.is_verified = $${paramCount}`;
      queryParams.push(verified === 'true');
    }

    // Add sorting
    const validSortFields = ['rating', 'review_count', 'created_at', 'business_name'];
    const validSortOrders = ['ASC', 'DESC'];
    
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())) {
      query += ` ORDER BY vp.${sortBy} ${sortOrder.toUpperCase()}`;
    } else {
      query += ' ORDER BY vp.rating DESC';
    }

    // Add pagination
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      WHERE u.is_active = true
    `;
    
    const countParams = [];
    paramCount = 0;

    if (category) {
      paramCount++;
      countQuery += ` AND vp.category ILIKE $${paramCount}`;
      countParams.push(`%${category}%`);
    }

    if (city) {
      paramCount++;
      countQuery += ` AND vp.city ILIKE $${paramCount}`;
      countParams.push(`%${city}%`);
    }

    if (search) {
      paramCount++;
      countQuery += ` AND (vp.business_name ILIKE $${paramCount} OR vp.description ILIKE $${paramCount})`;
      countParams.push(`%${search}%`);
    }

    if (verified !== undefined) {
      paramCount++;
      countQuery += ` AND vp.is_verified = $${paramCount}`;
      countParams.push(verified === 'true');
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      vendors: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Get vendor by ID (public)
router.get('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const vendorQuery = `
      SELECT 
        vp.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.created_at as user_created_at
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      WHERE vp.id = $1 AND u.is_active = true
    `;

    const vendorResult = await pool.query(vendorQuery, [id]);
    
    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendor = vendorResult.rows[0];

    // Get vendor's services
    const servicesQuery = `
      SELECT id, name, description, base_price, pricing_type, duration_hours, category
      FROM services 
      WHERE vendor_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;
    
    const servicesResult = await pool.query(servicesQuery, [vendor.user_id]);
    vendor.services = servicesResult.rows;

    // Get vendor's reviews
    const reviewsQuery = `
      SELECT r.*, u.first_name, u.last_name
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      WHERE r.vendor_id = $1 AND r.is_active = true
      ORDER BY r.created_at DESC
      LIMIT 10
    `;
    
    const reviewsResult = await pool.query(reviewsQuery, [vendor.user_id]);
    vendor.reviews = reviewsResult.rows;

    res.json({ vendor });

  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// Update vendor profile (vendor only)
router.put('/profile', authenticateToken, requireVendor, validateVendorProfile, async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessName, description, category, city, website, phone, address } = req.body;

    const updateQuery = `
      UPDATE vendor_profiles 
      SET 
        business_name = $1,
        description = $2,
        category = $3,
        city = $4,
        website = $5,
        phone = $6,
        address = $7,
        updated_at = NOW()
      WHERE user_id = $8
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      businessName, description, category, city, website, phone, address, userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    res.json({
      message: 'Vendor profile updated successfully',
      vendor: result.rows[0]
    });

  } catch (error) {
    console.error('Update vendor profile error:', error);
    res.status(500).json({ error: 'Failed to update vendor profile' });
  }
});

// Get vendor profile (vendor only)
router.get('/profile/me', authenticateToken, requireVendor, async (req, res) => {
  try {
    const userId = req.user.id;

    const profileQuery = `
      SELECT * FROM vendor_profiles WHERE user_id = $1
    `;

    const result = await pool.query(profileQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    res.json({ vendor: result.rows[0] });

  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor profile' });
  }
});

// Admin: Get all vendors (including unverified)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, verified, active } = req.query;

    let query = `
      SELECT 
        vp.*,
        u.first_name,
        u.last_name,
        u.email,
        u.is_active as user_active,
        u.created_at as user_created_at
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (verified !== undefined) {
      paramCount++;
      query += ` AND vp.is_verified = $${paramCount}`;
      queryParams.push(verified === 'true');
    }

    if (active !== undefined) {
      paramCount++;
      query += ` AND u.is_active = $${paramCount}`;
      queryParams.push(active === 'true');
    }

    query += ' ORDER BY vp.created_at DESC';

    // Add pagination
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    res.json({
      vendors: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Admin get vendors error:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Admin: Verify/Unverify vendor
router.patch('/admin/:id/verify', authenticateToken, requireAdmin, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({ error: 'isVerified must be a boolean' });
    }

    const updateQuery = `
      UPDATE vendor_profiles 
      SET is_verified = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [isVerified, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({
      message: `Vendor ${isVerified ? 'verified' : 'unverified'} successfully`,
      vendor: result.rows[0]
    });

  } catch (error) {
    console.error('Verify vendor error:', error);
    res.status(500).json({ error: 'Failed to update vendor verification status' });
  }
});

// Get vendor categories (public)
router.get('/categories/list', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category, COUNT(*) as vendor_count
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      WHERE u.is_active = true AND vp.is_verified = true
      GROUP BY category
      ORDER BY vendor_count DESC
    `;

    const result = await pool.query(query);
    
    res.json({ categories: result.rows });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
