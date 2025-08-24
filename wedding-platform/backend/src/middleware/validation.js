const { body, param, query, validationResult } = require('express-validator');

// Helper function to check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('userType')
    .isIn(['customer', 'vendor'])
    .withMessage('User type must be either customer or vendor'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required if provided'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Vendor profile validation
const validateVendorProfile = [
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Business name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  handleValidationErrors
];

// Service validation
const validateService = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Service name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
  body('basePrice')
    .isFloat({ min: 0.01 })
    .withMessage('Base price must be a positive number'),
  body('pricingType')
    .isIn(['hourly', 'daily', 'fixed'])
    .withMessage('Pricing type must be hourly, daily, or fixed'),
  body('durationHours')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),
  handleValidationErrors
];

// Booking validation
const validateBooking = [
  body('service_id')
    .isUUID()
    .withMessage('Valid service ID is required'),
  body('booking_date')
    .isISO8601()
    .withMessage('Valid booking date is required'),
  body('start_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('end_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('special_requests')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Special requests must be less than 1000 characters'),
  body('total_amount')
    .isFloat({ min: 0.01 })
    .withMessage('Total amount must be a positive number'),
  handleValidationErrors
];

// UUID parameter validation
const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('Valid UUID is required'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateVendorProfile,
  validateService,
  validateBooking,
  validateUUID,
  handleValidationErrors
};
