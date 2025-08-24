const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

const router = express.Router();

// User Registration
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { email, password, firstName, lastName, userType, phone } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, user_type, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, user_type, created_at`,
      [email, passwordHash, firstName, lastName, userType, phone]
    );

    const user = newUser.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // If vendor, create vendor profile
    if (userType === 'vendor') {
      await pool.query(
        'INSERT INTO vendor_profiles (user_id, business_name) VALUES ($1, $2)',
        [user.id, `${firstName} ${lastName}'s Business`]
      );
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        createdAt: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User Login
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, user_type, is_active FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Health check for testing
router.get('/health', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

module.exports = router;
