const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const userQuery = 'SELECT id, email, user_type, is_active FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'User account is deactivated' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      userType: user.user_type
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const requireUserType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedTypes,
        current: req.user.userType
      });
    }
    
    next();
  };
};

const requireCustomer = requireUserType(['customer']);
const requireVendor = requireUserType(['vendor']);
const requireAdmin = requireUserType(['admin']);
const requireVendorOrAdmin = requireUserType(['vendor', 'admin']);

module.exports = {
  authenticateToken,
  requireCustomer,
  requireVendor,
  requireAdmin,
  requireVendorOrAdmin
};
