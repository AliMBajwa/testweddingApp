const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireVendor, requireVendorOrAdmin } = require('../middleware/auth');
const { validateService, validateUUID } = require('../middleware/validation');

const router = express.Router();

// Search services (public) - with advanced filtering
router.get('/search', async (req, res) => {
  try {
    const { 
      category, 
      vendorId, 
      city, 
      search, 
      minPrice, 
      maxPrice, 
      pricingType,
      availableDate,
      page = 1, 
      limit = 20,
      sortBy = 'rating',
      sortOrder = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.base_price,
        s.pricing_type,
        s.duration_hours,
        s.category,
        s.rating,
        s.review_count,
        s.created_at,
        vp.business_name,
        vp.city,
        vp.is_verified,
        u.first_name,
        u.last_name
      FROM services s
      JOIN vendor_profiles vp ON s.vendor_id = vp.user_id
      JOIN users u ON s.vendor_id = u.id
      WHERE s.is_active = true AND u.is_active = true
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Add filters
    if (category) {
      paramCount++;
      query += ` AND s.category ILIKE $${paramCount}`;
      queryParams.push(`%${category}%`);
    }

    if (vendorId) {
      paramCount++;
      query += ` AND s.vendor_id = $${paramCount}`;
      queryParams.push(vendorId);
    }

    if (city) {
      paramCount++;
      query += ` AND vp.city ILIKE $${paramCount}`;
      queryParams.push(`%${city}%`);
    }

    if (search) {
      paramCount++;
      query += ` AND (s.name ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (minPrice) {
      paramCount++;
      query += ` AND s.base_price >= $${paramCount}`;
      queryParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      paramCount++;
      query += ` AND s.base_price <= $${paramCount}`;
      queryParams.push(parseFloat(maxPrice));
    }

    if (pricingType) {
      paramCount++;
      query += ` AND s.pricing_type = $${paramCount}`;
      queryParams.push(pricingType);
    }

    // Add sorting
    const validSortFields = ['rating', 'review_count', 'created_at', 'base_price', 'name'];
    const validSortOrders = ['ASC', 'DESC'];
    
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())) {
      query += ` ORDER BY s.${sortBy} ${sortOrder.toUpperCase()}`;
    } else {
      query += ' ORDER BY s.rating DESC';
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
      FROM services s
      JOIN vendor_profiles vp ON s.vendor_id = vp.user_id
      JOIN users u ON s.vendor_id = u.id
      WHERE s.is_active = true AND u.is_active = true
    `;
    
    const countParams = [];
    paramCount = 0;

    if (category) {
      paramCount++;
      countQuery += ` AND s.category ILIKE $${paramCount}`;
      countParams.push(`%${category}%`);
    }

    if (vendorId) {
      paramCount++;
      countQuery += ` AND s.vendor_id = $${paramCount}`;
      countParams.push(vendorId);
    }

    if (city) {
      paramCount++;
      countQuery += ` AND vp.city ILIKE $${paramCount}`;
      countParams.push(`%${city}%`);
    }

    if (search) {
      paramCount++;
      countQuery += ` AND (s.name ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
      countParams.push(`%${search}%`);
    }

    if (minPrice) {
      paramCount++;
      countQuery += ` AND s.base_price >= $${paramCount}`;
      countParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      paramCount++;
      countQuery += ` AND s.base_price <= $${paramCount}`;
      countParams.push(parseFloat(maxPrice));
    }

    if (pricingType) {
      paramCount++;
      countQuery += ` AND s.pricing_type = $${paramCount}`;
      countParams.push(pricingType);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      services: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Search services error:', error);
    res.status(500).json({ error: 'Failed to search services' });
  }
});

// Get service by ID (public)
router.get('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const serviceQuery = `
      SELECT 
        s.*,
        vp.business_name,
        vp.city,
        vp.is_verified,
        vp.rating as vendor_rating,
        vp.review_count as vendor_review_count,
        u.first_name,
        u.last_name,
        u.email,
        u.phone
      FROM services s
      JOIN vendor_profiles vp ON s.vendor_id = vp.user_id
      JOIN users u ON s.vendor_id = u.id
      WHERE s.id = $1 AND s.is_active = true AND u.is_active = true
    `;

    const serviceResult = await pool.query(serviceQuery, [id]);
    
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const service = serviceResult.rows[0];

    // Get service media
    const mediaQuery = `
      SELECT id, media_type, url, caption, sort_order
      FROM service_media 
      WHERE service_id = $1 AND is_active = true
      ORDER BY sort_order, created_at
    `;
    
    const mediaResult = await pool.query(mediaQuery, [id]);
    service.media = mediaResult.rows;

    // Get service availability
    const availabilityQuery = `
      SELECT id, available_date, start_time, end_time, is_available
      FROM availability 
      WHERE service_id = $1 AND available_date >= CURRENT_DATE
      ORDER BY available_date, start_time
      LIMIT 30
    `;
    
    const availabilityResult = await pool.query(availabilityQuery, [id]);
    service.availability = availabilityResult.rows;

    // Get service reviews
    const reviewsQuery = `
      SELECT r.*, u.first_name, u.last_name
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      WHERE r.service_id = $1 AND r.is_active = true
      ORDER BY r.created_at DESC
      LIMIT 10
    `;
    
    const reviewsResult = await pool.query(reviewsQuery, [id]);
    service.reviews = reviewsResult.rows;

    res.json({ service });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Create service (vendor only)
router.post('/', authenticateToken, requireVendor, validateService, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { 
      name, 
      description, 
      category, 
      basePrice, 
      pricingType, 
      durationHours,
      faq 
    } = req.body;

    // Check if vendor profile exists
    const profileCheck = await pool.query(
      'SELECT id FROM vendor_profiles WHERE user_id = $1',
      [vendorId]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Vendor profile not found. Please complete your profile first.' });
    }

    const createQuery = `
      INSERT INTO services (
        vendor_id, name, description, category, base_price, 
        pricing_type, duration_hours, faq
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(createQuery, [
      vendorId, name, description, category, basePrice, 
      pricingType, durationHours, faq
    ]);

    res.status(201).json({
      message: 'Service created successfully',
      service: result.rows[0]
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update service (vendor only)
router.put('/:id', authenticateToken, requireVendor, validateUUID, validateService, async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    const { 
      name, 
      description, 
      category, 
      basePrice, 
      pricingType, 
      durationHours,
      faq 
    } = req.body;

    // Check if service belongs to vendor
    const serviceCheck = await pool.query(
      'SELECT id FROM services WHERE id = $1 AND vendor_id = $2 AND is_active = true',
      [id, vendorId]
    );

    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found or access denied' });
    }

    const updateQuery = `
      UPDATE services 
      SET 
        name = $1,
        description = $2,
        category = $3,
        base_price = $4,
        pricing_type = $5,
        duration_hours = $6,
        faq = $7,
        updated_at = NOW()
      WHERE id = $8 AND vendor_id = $9
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      name, description, category, basePrice, 
      pricingType, durationHours, faq, id, vendorId
    ]);

    res.json({
      message: 'Service updated successfully',
      service: result.rows[0]
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete service (soft delete - vendor only)
router.delete('/:id', authenticateToken, requireVendor, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;

    // Check if service belongs to vendor
    const serviceCheck = await pool.query(
      'SELECT id FROM services WHERE id = $1 AND vendor_id = $2 AND is_active = true',
      [id, vendorId]
    );

    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found or access denied' });
    }

    // Check if service has active bookings
    const bookingCheck = await pool.query(
      'SELECT id FROM bookings WHERE service_id = $1 AND status IN ($2, $3, $4)',
      [id, 'confirmed', 'in_progress', 'completed']
    );

    if (bookingCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete service with active bookings. Please cancel or complete all bookings first.' 
      });
    }

    // Soft delete
    const deleteQuery = `
      UPDATE services 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND vendor_id = $2
      RETURNING id
    `;

    const result = await pool.query(deleteQuery, [id, vendorId]);

    res.json({
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Get vendor's services (vendor only)
router.get('/vendor/my-services', authenticateToken, requireVendor, async (req, res) => {
  try {
    const vendorId = req.user.id;

    const servicesQuery = `
      SELECT 
        s.*,
        COUNT(sm.id) as media_count,
        COUNT(a.id) as availability_count
      FROM services s
      LEFT JOIN service_media sm ON s.id = sm.service_id AND sm.is_active = true
      LEFT JOIN availability a ON s.id = a.service_id AND a.is_available = true
      WHERE s.vendor_id = $1 AND s.is_active = true
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `;

    const result = await pool.query(servicesQuery, [vendorId]);

    res.json({ services: result.rows });

  } catch (error) {
    console.error('Get vendor services error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor services' });
  }
});

// Get service categories (public)
router.get('/categories/list', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category, COUNT(*) as service_count
      FROM services s
      JOIN users u ON s.vendor_id = u.id
      WHERE s.is_active = true AND u.is_active = true
      GROUP BY category
      ORDER BY service_count DESC
    `;

    const result = await pool.query(query);
    
    res.json({ categories: result.rows });

  } catch (error) {
    console.error('Get service categories error:', error);
    res.status(500).json({ error: 'Failed to fetch service categories' });
  }
});

module.exports = router;
