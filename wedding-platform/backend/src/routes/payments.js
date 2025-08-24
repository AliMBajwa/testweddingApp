const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireCustomer, requireVendor, requireAdmin } = require('../middleware/auth');
const { validateUUID } = require('../middleware/validation');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Get all payments for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let query, params;

    if (role === 'customer') {
      // Customers see their own payments
      query = `
        SELECT p.*, b.booking_date, b.start_time, b.end_time,
               s.name as service_name, s.category as service_category,
               vp.business_name as vendor_name
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN services s ON b.service_id = s.id
        JOIN users u ON b.vendor_id = u.id
        JOIN vendor_profiles vp ON u.id = vp.user_id
        WHERE p.customer_id = $1
        ORDER BY p.created_at DESC
      `;
      params = [userId];
    } else if (role === 'vendor') {
      // Vendors see payments for their services
      query = `
        SELECT p.*, b.booking_date, b.start_time, b.end_time,
               s.name as service_name, s.category as service_category,
               u.email as customer_email, u.first_name, u.last_name
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN services s ON b.service_id = s.id
        JOIN users u ON b.customer_id = u.id
        WHERE p.vendor_id = $1
        ORDER BY p.created_at DESC
      `;
      params = [userId];
    } else {
      // Admins see all payments
      query = `
        SELECT p.*, b.booking_date, b.start_time, b.end_time,
               s.name as service_name, s.category as service_category,
               vp.business_name as vendor_name,
               cu.email as customer_email, cu.first_name as customer_first_name, cu.last_name as customer_last_name,
               vu.email as vendor_email, vu.first_name as vendor_first_name, vu.last_name as vendor_last_name
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN services s ON b.service_id = s.id
        JOIN users cu ON b.customer_id = cu.id
        JOIN users vu ON b.vendor_id = vu.id
        JOIN vendor_profiles vp ON vu.id = vp.user_id
        ORDER BY p.created_at DESC
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
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get a specific payment by ID
router.get('/:id', authenticateToken, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    let query, params;

    if (role === 'customer') {
      // Customers can only see their own payments
      query = `
        SELECT p.*, b.booking_date, b.start_time, b.end_time,
               s.name as service_name, s.description as service_description,
               s.category as service_category, s.base_price, s.pricing_type,
               vp.business_name as vendor_name, vp.city as vendor_city, vp.phone as vendor_phone,
               u.email as vendor_email
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN services s ON b.service_id = s.id
        JOIN users u ON b.vendor_id = u.id
        JOIN vendor_profiles vp ON u.id = vp.user_id
        WHERE p.id = $1 AND p.customer_id = $2
      `;
      params = [id, userId];
    } else if (role === 'vendor') {
      // Vendors can see payments for their services
      query = `
        SELECT p.*, b.booking_date, b.start_time, b.end_time,
               s.name as service_name, s.description as service_description,
               s.category as service_category, s.base_price, s.pricing_type,
               u.email as customer_email, u.first_name, u.last_name, u.phone as customer_phone
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN services s ON b.service_id = s.id
        JOIN users u ON b.customer_id = u.id
        WHERE p.id = $1 AND p.vendor_id = $2
      `;
      params = [id, userId];
    } else {
      // Admins can see any payment
      query = `
        SELECT p.*, b.booking_date, b.start_time, b.end_time,
               s.name as service_name, s.description as service_description,
               s.category as service_category, s.base_price, s.pricing_type,
               vp.business_name as vendor_name, vp.city as vendor_city, vp.phone as vendor_phone,
               cu.email as customer_email, cu.first_name as customer_first_name, cu.last_name as customer_last_name,
               vu.email as vendor_email, vu.first_name as vendor_first_name, vu.last_name as vendor_last_name
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN services s ON b.service_id = s.id
        JOIN users cu ON b.customer_id = cu.id
        JOIN users vu ON b.vendor_id = vu.id
        JOIN vendor_profiles vp ON vu.id = vp.user_id
        WHERE p.id = $1
      `;
      params = [id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create a payment intent (for customers to initiate payment)
router.post('/create-intent', authenticateToken, requireCustomer, async (req, res) => {
  try {
    const { booking_id, payment_method_id } = req.body;
    const customer_id = req.user.id;

    // Validate booking exists and belongs to customer
    const bookingCheck = await pool.query(
      `SELECT b.*, s.name as service_name, s.base_price, s.pricing_type,
              u.email as vendor_email, vp.business_name as vendor_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.vendor_id = u.id
       JOIN vendor_profiles vp ON u.id = vp.user_id
       WHERE b.id = $1 AND b.customer_id = $2 AND b.status IN ('pending', 'confirmed')`,
      [booking_id, customer_id]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or cannot be paid for'
      });
    }

    const booking = bookingCheck.rows[0];

    // Check if payment already exists
    const existingPayment = await pool.query(
      'SELECT * FROM payments WHERE booking_id = $1 AND status IN ($2, $3)',
      [booking_id, 'pending', 'completed']
    );

    if (existingPayment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this booking'
      });
    }

    // Calculate total amount (including any price modifiers from availability)
    let totalAmount = parseFloat(booking.base_price);
    
    // Check for price modifiers from availability
    const availabilityCheck = await pool.query(
      `SELECT price_modifier FROM availability 
       WHERE service_id = $1 
       AND available_date = $2 
       AND start_time <= $3 
       AND end_time >= $4`,
      [booking.service_id, booking.booking_date, booking.start_time, booking.end_time]
    );

    if (availabilityCheck.rows.length > 0) {
      const priceModifier = parseFloat(availabilityCheck.rows[0].price_modifier || 1.0);
      totalAmount = totalAmount * priceModifier;
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'gbp',
      metadata: {
        booking_id: booking_id,
        customer_id: customer_id,
        vendor_id: booking.vendor_id,
        service_name: booking.service_name
      },
      customer: customer_id, // You might want to create Stripe customers for your users
      payment_method: payment_method_id,
      confirm: true,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/confirm`
    });

    // Create payment record in database
    const paymentResult = await pool.query(
      `INSERT INTO payments 
       (booking_id, customer_id, vendor_id, amount, currency, payment_method, 
        stripe_payment_intent_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [booking_id, customer_id, booking.vendor_id, totalAmount, 'GBP', 
       payment_method_id, paymentIntent.id, 'pending']
    );

    // Update booking status to confirmed if payment is successful
    if (paymentIntent.status === 'succeeded') {
      await pool.query(
        'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['confirmed', booking_id]
      );

      // Update payment status
      await pool.query(
        'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', paymentResult.rows[0].id]
      );
    }

    res.json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        payment_intent: paymentIntent,
        payment_record: paymentResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        message: 'Payment failed: ' + error.message
      });
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment request: ' + error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Confirm payment (webhook from Stripe)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Update payment status in database
        await pool.query(
          `UPDATE payments 
           SET status = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE stripe_payment_intent_id = $2`,
          ['completed', paymentIntent.id]
        );

        // Update booking status
        await pool.query(
          `UPDATE bookings 
           SET status = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = (
             SELECT booking_id FROM payments WHERE stripe_payment_intent_id = $2
           )`,
          ['confirmed', paymentIntent.id]
        );
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        
        // Update payment status in database
        await pool.query(
          `UPDATE payments 
           SET status = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE stripe_payment_intent_id = $2`,
          ['failed', failedPayment.id]
        );
        break;

      case 'charge.refunded':
        const refund = event.data.object;
        
        // Update payment status to refunded
        await pool.query(
          `UPDATE payments 
           SET status = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE stripe_payment_intent_id = $2`,
          ['refunded', refund.payment_intent]
        );

        // Update booking status to cancelled
        await pool.query(
          `UPDATE bookings 
           SET status = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = (
             SELECT booking_id FROM payments WHERE stripe_payment_intent_id = $2
           )`,
          ['cancelled', refund.payment_intent]
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Process refund (vendors and admins only)
router.post('/:id/refund', authenticateToken, requireVendor, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { role, id: userId } = req.user;

    // Check if payment exists and user has permission
    let query, params;
    if (role === 'vendor') {
      query = 'SELECT * FROM payments WHERE id = $1 AND vendor_id = $2';
      params = [id, userId];
    } else {
      query = 'SELECT * FROM payments WHERE id = $1';
      params = [id];
    }

    const paymentCheck = await pool.query(query, params);
    if (paymentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or access denied'
      });
    }

    const payment = paymentCheck.rows[0];

    // Only allow refunds for completed payments
    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund completed payments'
      });
    }

    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      reason: reason || 'requested_by_customer'
    });

    // Update payment status to refunded
    await pool.query(
      'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['refunded', id]
    );

    // Update booking status to cancelled
    await pool.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', payment.booking_id]
    );

    // Make the time slot available again
    const booking = await pool.query(
      'SELECT service_id, booking_date, start_time, end_time FROM bookings WHERE id = $1',
      [payment.booking_id]
    );

    if (booking.rows.length > 0) {
      const b = booking.rows[0];
      await pool.query(
        `UPDATE availability 
         SET is_available = true 
         WHERE service_id = $1 
         AND available_date = $2 
         AND start_time <= $3 
         AND end_time >= $4`,
        [b.service_id, b.booking_date, b.start_time, b.end_time]
      );
    }

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund_id: refund.id,
        amount: refund.amount / 100, // Convert from cents
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get payment statistics (for vendors and admins)
router.get('/stats/overview', authenticateToken, requireVendor, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let query, params;

    if (role === 'vendor') {
      query = `
        SELECT 
          COUNT(*) as total_payments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
          COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_payments,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
          SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as total_refunds
        FROM payments 
        WHERE vendor_id = $1
      `;
      params = [userId];
    } else {
      query = `
        SELECT 
          COUNT(*) as total_payments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
          COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_payments,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
          SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as total_refunds
        FROM payments
      `;
      params = [];
    }

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        ...stats,
        total_revenue: parseFloat(stats.total_revenue || 0),
        total_refunds: parseFloat(stats.total_refunds || 0),
        net_revenue: parseFloat(stats.total_revenue || 0) - parseFloat(stats.total_refunds || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get payment methods for a customer (for future use)
router.get('/payment-methods/:customerId', authenticateToken, requireAdmin, validateUUID, async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get customer's payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    res.json({
      success: true,
      data: paymentMethods.data
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
