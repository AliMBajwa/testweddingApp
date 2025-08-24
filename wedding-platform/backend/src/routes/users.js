const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateUUID } = require('../middleware/validation');

const router = express.Router();

// Get user's own profile
router.get('/profile/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.user_type,
        u.is_active,
        u.created_at,
        u.updated_at,
        CASE 
          WHEN u.user_type = 'vendor' THEN vp.business_name
          ELSE NULL
        END as business_name,
        CASE 
          WHEN u.user_type = 'vendor' THEN vp.category
          ELSE NULL
        END as category,
        CASE 
          WHEN u.user_type = 'vendor' THEN vp.city
          ELSE NULL
        END as city
      FROM users u
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      WHERE u.id = $1
    `;

    const result = await pool.query(userQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user's own profile
router.put('/profile/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone } = req.body;

    // Validate input
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const updateQuery = `
      UPDATE users 
      SET 
        first_name = $1,
        last_name = $2,
        phone = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, first_name, last_name, phone, updated_at
    `;

    const result = await pool.query(updateQuery, [firstName, lastName, phone, userId]);

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/profile/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    // Verify current password
    const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `;

    await pool.query(updateQuery, [newPasswordHash, userId]);

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Admin: Get all users
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, userType, active } = req.query;

    let query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.user_type,
        u.is_active,
        u.created_at,
        u.updated_at,
        CASE 
          WHEN u.user_type = 'vendor' THEN vp.business_name
          ELSE NULL
        END as business_name,
        CASE 
          WHEN u.user_type = 'vendor' THEN vp.is_verified
          ELSE NULL
        END as is_verified
      FROM users u
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (userType) {
      paramCount++;
      query += ` AND u.user_type = $${paramCount}`;
      queryParams.push(userType);
    }

    if (active !== undefined) {
      paramCount++;
      query += ` AND u.is_active = $${paramCount}`;
      queryParams.push(active === 'true');
    }

    query += ' ORDER BY u.created_at DESC';

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
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Get user by ID
router.get('/admin/:id', authenticateToken, requireAdmin, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const userQuery = `
      SELECT 
        u.*,
        CASE 
          WHEN u.user_type = 'vendor' THEN vp.business_name
          ELSE NULL
        END as business_name,
        CASE 
          WHEN u.user_type = 'vendor' THEN vp.category
          ELSE NULL
        END as category,
        CASE 
          WHEN u.user_type = 'vendor' THEN vp.city
          ELSE NULL
        END as city,
        CASE 
          WHEN u.user_type = 'vendor' THEN vp.is_verified
          ELSE NULL
        END as is_verified
      FROM users u
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      WHERE u.id = $1
    `;

    const result = await pool.query(userQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Admin: Update user
router.put('/admin/:id', authenticateToken, requireAdmin, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, userType, isActive } = req.body;

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email is already taken by another user' });
      }
    }

    const updateQuery = `
      UPDATE users 
      SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        user_type = COALESCE($5, user_type),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      firstName, lastName, email, phone, userType, isActive, id
    ]);

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Admin: Deactivate/Activate user
router.patch('/admin/:id/status', authenticateToken, requireAdmin, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateQuery = `
      UPDATE users 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, is_active
    `;

    const result = await pool.query(updateQuery, [isActive, id]);

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Admin: Delete user (soft delete)
router.delete('/admin/:id', authenticateToken, requireAdmin, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has active bookings
    const bookingCheck = await pool.query(
      'SELECT id FROM bookings WHERE (customer_id = $1 OR vendor_id = $1) AND status IN ($2, $3, $4)',
      [id, 'confirmed', 'in_progress', 'completed']
    );

    if (bookingCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with active bookings. Please cancel or complete all bookings first.' 
      });
    }

    // Soft delete user
    const deleteQuery = `
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;

    await pool.query(deleteQuery, [id]);

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get user statistics (admin only)
router.get('/admin/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total users by type
    const userStatsQuery = `
      SELECT 
        user_type,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM users 
      GROUP BY user_type
    `;

    const userStatsResult = await pool.query(userStatsQuery);

    // Recent registrations
    const recentUsersQuery = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.user_type,
        u.created_at
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 10
    `;

    const recentUsersResult = await pool.query(recentUsersQuery);

    // Vendor verification stats
    const vendorStatsQuery = `
      SELECT 
        COUNT(*) as total_vendors,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_vendors,
        COUNT(CASE WHEN is_verified = false THEN 1 END) as unverified_vendors
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      WHERE u.is_active = true
    `;

    const vendorStatsResult = await pool.query(vendorStatsQuery);

    res.json({
      userStats: userStatsResult.rows,
      recentUsers: recentUsersResult.rows,
      vendorStats: vendorStatsResult.rows[0]
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

module.exports = router;
