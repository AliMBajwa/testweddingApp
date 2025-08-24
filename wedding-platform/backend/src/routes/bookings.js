const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireCustomer, requireVendor, requireVendorOrAdmin } = require('../middleware/auth');
const { validateBooking, validateUUID } = require('../middleware/validation');

// Get all bookings for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let query, params;

    if (role === 'customer') {
      // Customers see their own bookings
      query = `
        SELECT b.*, s.name as service_name, s.category as service_category,
               vp.business_name as vendor_name, vp.city as vendor_city,
               u.email as vendor_email
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN users u ON b.vendor_id = u.id
        JOIN vendor_profiles vp ON u.id = vp.user_id
        WHERE b.customer_id = $1
        ORDER BY b.created_at DESC
      `;
      params = [userId];
    } else if (role === 'vendor') {
      // Vendors see bookings for their services
      query = `
        SELECT b.*, s.name as service_name, s.category as service_category,
               u.email as customer_email, u.first_name, u.last_name
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN users u ON b.customer_id = u.id
        WHERE b.vendor_id = $1
        ORDER BY b.created_at DESC
      `;
      params = [userId];
    } else {
      // Admins see all bookings
      query = `
        SELECT b.*, s.name as service_name, s.category as service_category,
               vp.business_name as vendor_name, vp.city as vendor_city,
               cu.email as customer_email, cu.first_name as customer_first_name, cu.last_name as customer_last_name,
               vu.email as vendor_email, vu.first_name as vendor_first_name, vu.last_name as vendor_last_name
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN users cu ON b.customer_id = cu.id
        JOIN users vu ON b.vendor_id = vu.id
        JOIN vendor_profiles vp ON vu.id = vp.user_id
        ORDER BY b.created_at DESC
      `;
      params = [];
    }

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get a specific booking by ID
router.get('/:id', authenticateToken, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    let query, params;

    if (role === 'customer') {
      // Customers can only see their own bookings
      query = `
        SELECT b.*, s.name as service_name, s.description as service_description,
               s.category as service_category, s.base_price, s.pricing_type,
               vp.business_name as vendor_name, vp.city as vendor_city, vp.phone as vendor_phone,
               u.email as vendor_email
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN users u ON b.vendor_id = u.id
        JOIN vendor_profiles vp ON u.id = vp.user_id
        WHERE b.id = $1 AND b.customer_id = $2
      `;
      params = [id, userId];
    } else if (role === 'vendor') {
      // Vendors can see bookings for their services
      query = `
        SELECT b.*, s.name as service_name, s.description as service_description,
               s.category as service_category, s.base_price, s.pricing_type,
               u.email as customer_email, u.first_name, u.last_name, u.phone as customer_phone
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN users u ON b.customer_id = u.id
        WHERE b.id = $1 AND b.vendor_id = $2
      `;
      params = [id, userId];
    } else {
      // Admins can see any booking
      query = `
        SELECT b.*, s.name as service_name, s.description as service_description,
               s.category as service_category, s.base_price, s.pricing_type,
               vp.business_name as vendor_name, vp.city as vendor_city, vp.phone as vendor_phone,
               cu.email as customer_email, cu.first_name as customer_first_name, cu.last_name as customer_last_name,
               vu.email as vendor_email, vu.first_name as vendor_first_name, vu.last_name as vendor_last_name
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN users cu ON b.customer_id = cu.id
        JOIN users vu ON b.vendor_id = vu.id
        JOIN vendor_profiles vp ON vu.id = vp.user_id
        WHERE b.id = $1
      `;
      params = [id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create a new booking (customers only)
router.post('/', authenticateToken, requireCustomer, validateBooking, async (req, res) => {
  try {
    const { service_id, booking_date, start_time, end_time, special_requests, total_amount } = req.body;
    const customer_id = req.user.id;

    // Check if service exists and is active
    const serviceCheck = await pool.query(
      'SELECT * FROM services WHERE id = $1 AND is_active = true',
      [service_id]
    );

    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or inactive'
      });
    }

    const service = serviceCheck.rows[0];
    const vendor_id = service.vendor_id;

    // Check if vendor is verified
    const vendorCheck = await pool.query(
      'SELECT is_verified FROM vendor_profiles WHERE user_id = $1',
      [vendor_id]
    );

    if (vendorCheck.rows.length === 0 || !vendorCheck.rows[0].is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book with unverified vendor'
      });
    }

    // Check if the requested time slot is available
    const availabilityCheck = await pool.query(
      `SELECT * FROM availability 
       WHERE service_id = $1 
       AND available_date = $2 
       AND start_time <= $3 
       AND end_time >= $4 
       AND is_available = true`,
      [service_id, booking_date, start_time, end_time]
    );

    if (availabilityCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Requested time slot is not available'
      });
    }

    // Check if customer already has a booking for this time slot
    const existingBookingCheck = await pool.query(
      `SELECT * FROM bookings 
       WHERE customer_id = $1 
       AND booking_date = $2 
       AND status IN ('pending', 'confirmed', 'in_progress')
       AND (
         (start_time <= $3 AND end_time > $3) OR
         (start_time < $4 AND end_time >= $4) OR
         (start_time >= $3 AND end_time <= $4)
       )`,
      [customer_id, booking_date, start_time, end_time]
    );

    if (existingBookingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a booking for this time slot'
      });
    }

    // Create the booking
    const result = await pool.query(
      `INSERT INTO bookings 
       (customer_id, vendor_id, service_id, booking_date, start_time, end_time, 
        special_requests, total_amount, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') 
       RETURNING *`,
      [customer_id, vendor_id, service_id, booking_date, start_time, end_time, 
       special_requests, total_amount]
    );

    // Update availability to mark the slot as booked
    await pool.query(
      `UPDATE availability 
       SET is_available = false 
       WHERE service_id = $1 
       AND available_date = $2 
       AND start_time <= $3 
       AND end_time >= $4`,
      [service_id, booking_date, start_time, end_time]
    );

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update booking status (vendors and admins only)
router.patch('/:id/status', authenticateToken, requireVendorOrAdmin, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { role, id: userId } = req.user;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    // Check if booking exists and user has permission
    let query, params;
    if (role === 'vendor') {
      query = 'SELECT * FROM bookings WHERE id = $1 AND vendor_id = $2';
      params = [id, userId];
    } else {
      query = 'SELECT * FROM bookings WHERE id = $1';
      params = [id];
    }

    const bookingCheck = await pool.query(query, params);
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }

    const booking = bookingCheck.rows[0];

    // Update the booking status
    const result = await pool.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    // If status is cancelled, make the time slot available again
    if (status === 'cancelled') {
      await pool.query(
        `UPDATE availability 
         SET is_available = true 
         WHERE service_id = $1 
         AND available_date = $2 
         AND start_time <= $3 
         AND end_time >= $4`,
        [booking.service_id, booking.booking_date, booking.start_time, booking.end_time]
      );
    }

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update booking details (customers can update their own pending bookings)
router.put('/:id', authenticateToken, validateUUID, validateBooking, async (req, res) => {
  try {
    const { id } = req.params;
    const { booking_date, start_time, end_time, special_requests, total_amount } = req.body;
    const { role, id: userId } = req.user;

    // Check if booking exists and user has permission
    let query, params;
    if (role === 'customer') {
      query = 'SELECT * FROM bookings WHERE id = $1 AND customer_id = $2';
      params = [id, userId];
    } else if (role === 'vendor') {
      query = 'SELECT * FROM bookings WHERE id = $1 AND vendor_id = $2';
      params = [id, userId];
    } else {
      query = 'SELECT * FROM bookings WHERE id = $1';
      params = [id];
    }

    const bookingCheck = await pool.query(query, params);
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }

    const booking = bookingCheck.rows[0];

    // Only allow updates to pending or confirmed bookings
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update booking with status: ' + booking.status
      });
    }

    // If changing date/time, check availability
    if (booking_date !== booking.booking_date || 
        start_time !== booking.start_time || 
        end_time !== booking.end_time) {
      
      // Check if the new time slot is available
      const availabilityCheck = await pool.query(
        `SELECT * FROM availability 
         WHERE service_id = $1 
         AND available_date = $2 
         AND start_time <= $3 
         AND end_time >= $4 
         AND is_available = true`,
        [booking.service_id, booking_date, start_time, end_time]
      );

      if (availabilityCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Requested time slot is not available'
        });
      }

      // Make the old time slot available again
      await pool.query(
        `UPDATE availability 
         SET is_available = true 
         WHERE service_id = $1 
         AND available_date = $2 
         AND start_time <= $3 
         AND end_time >= $4`,
        [booking.service_id, booking.booking_date, booking.start_time, booking.end_time]
      );

      // Mark the new time slot as booked
      await pool.query(
        `UPDATE availability 
         SET is_available = false 
         WHERE service_id = $1 
         AND available_date = $2 
         AND start_time <= $3 
         AND end_time >= $4`,
        [booking.service_id, booking_date, start_time, end_time]
      );
    }

    // Update the booking
    const result = await pool.query(
      `UPDATE bookings 
       SET booking_date = $1, start_time = $2, end_time = $3, 
           special_requests = $4, total_amount = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 RETURNING *`,
      [booking_date, start_time, end_time, special_requests, total_amount, id]
    );

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Cancel a booking (customers can cancel their own pending/confirmed bookings)
router.delete('/:id', authenticateToken, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Check if booking exists and user has permission
    let query, params;
    if (role === 'customer') {
      query = 'SELECT * FROM bookings WHERE id = $1 AND customer_id = $2';
      params = [id, userId];
    } else if (role === 'vendor') {
      query = 'SELECT * FROM bookings WHERE id = $1 AND vendor_id = $2';
      params = [id, userId];
    } else {
      query = 'SELECT * FROM bookings WHERE id = $1';
      params = [id];
    }

    const bookingCheck = await pool.query(query, params);
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }

    const booking = bookingCheck.rows[0];

    // Only allow cancellation of pending or confirmed bookings
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking with status: ' + booking.status
      });
    }

    // Update status to cancelled
    await pool.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', id]
    );

    // Make the time slot available again
    await pool.query(
      `UPDATE availability 
       SET is_available = true 
       WHERE service_id = $1 
       AND available_date = $2 
       AND start_time <= $3 
       AND end_time >= $4`,
      [booking.service_id, booking.booking_date, booking.start_time, booking.end_time]
    );

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get booking statistics (for vendors and admins)
router.get('/stats/overview', authenticateToken, requireVendorOrAdmin, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let query, params;

    if (role === 'vendor') {
      query = `
        SELECT 
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_bookings,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
          SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue
        FROM bookings 
        WHERE vendor_id = $1
      `;
      params = [userId];
    } else {
      query = `
        SELECT 
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_bookings,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
          SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue
        FROM bookings
      `;
      params = [];
    }

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        ...stats,
        total_revenue: parseFloat(stats.total_revenue || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
