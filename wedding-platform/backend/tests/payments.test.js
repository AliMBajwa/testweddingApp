const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');

// Mock the database pool, Stripe, and JWT
jest.mock('../src/config/database');
jest.mock('stripe', () => {
  return jest.fn(() => ({
    paymentIntents: {
      create: jest.fn()
    },
    refunds: {
      create: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    },
    paymentMethods: {
      list: jest.fn()
    }
  }));
});
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

describe('Payments Routes', () => {
  let mockPool;
  let mockStripe;
  let mockToken;
  let mockUser;
  let jwt;

  beforeEach(() => {
    mockPool = {
      query: jest.fn()
    };
    pool.query = mockPool.query;

    mockToken = 'mock-jwt-token';
    mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      role: 'customer',
      email: 'test@example.com'
    };

    // Mock JWT verification
    jwt = require('jsonwebtoken');
    jwt.verify.mockReturnValue(mockUser);

    // Mock Stripe
    const Stripe = require('stripe');
    mockStripe = new Stripe();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/payments', () => {
    it('should return customer payments for customer role', async () => {
      const mockPayments = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          amount: 500.00,
          status: 'completed',
          service_name: 'Wedding Photography',
          vendor_name: 'Photo Pro'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPayments });

      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPayments);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT p.*, b.booking_date'),
        [mockUser.id]
      );
    });

    it('should return vendor payments for vendor role', async () => {
      mockUser.role = 'vendor';
      const mockPayments = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          amount: 500.00,
          status: 'completed',
          service_name: 'Wedding Photography',
          customer_email: 'customer@example.com'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPayments });

      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPayments);
    });

    it('should return all payments for admin role', async () => {
      mockUser.role = 'admin';
      const mockPayments = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          amount: 500.00,
          status: 'completed',
          service_name: 'Wedding Photography',
          vendor_name: 'Photo Pro',
          customer_email: 'customer@example.com'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPayments });

      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPayments);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch payments');
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    it('should return a specific payment for customer', async () => {
      const mockPayment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 500.00,
        status: 'completed',
        service_name: 'Wedding Photography',
        vendor_name: 'Photo Pro'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockPayment] });

      const response = await request(app)
        .get('/api/v1/payments/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPayment);
    });

    it('should return 404 for non-existent payment', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/payments/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment not found');
    });

    it('should validate UUID parameter', async () => {
      const response = await request(app)
        .get('/api/v1/payments/invalid-uuid')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/payments/create-intent', () => {
    const validPaymentData = {
      booking_id: '123e4567-e89b-12d3-a456-426614174000',
      payment_method_id: 'pm_test_payment_method'
    };

    it('should create payment intent successfully', async () => {
      const mockBooking = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        service_id: '456e7890-e89b-12d3-a456-426614174000',
        vendor_id: '789e0123-e89b-12d3-a456-426614174000',
        status: 'pending',
        service_name: 'Wedding Photography',
        base_price: 500.00,
        pricing_type: 'fixed'
      };

      const mockVendor = { business_name: 'Photo Pro' };
      const mockAvailability = [{ price_modifier: 1.0 }];
      const mockExistingPayment = { rows: [] };
      const mockPaymentIntent = {
        id: 'pi_test_payment_intent',
        status: 'succeeded',
        amount: 50000
      };
      const mockNewPayment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        booking_id: validPaymentData.booking_id,
        amount: 500.00
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: [mockVendor] })
        .mockResolvedValueOnce({ rows: mockAvailability })
        .mockResolvedValueOnce(mockExistingPayment)
        .mockResolvedValueOnce({ rows: [mockNewPayment] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      mockStripe.paymentIntents.create.mockResolvedValueOnce(mockPaymentIntent);

      const response = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPaymentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment intent created successfully');
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 50000,
        currency: 'gbp',
        metadata: expect.any(Object),
        customer: mockUser.id,
        payment_method: validPaymentData.payment_method_id,
        confirm: true,
        return_url: expect.any(String)
      });
    });

    it('should reject payment for non-existent booking', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPaymentData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Booking not found or cannot be paid for');
    });

    it('should reject payment for completed booking', async () => {
      const mockBooking = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockBooking] });

      const response = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPaymentData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Booking not found or cannot be paid for');
    });

    it('should reject duplicate payment', async () => {
      const mockBooking = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'pending'
      };

      const mockExistingPayment = {
        rows: [{ id: 'existing-payment-id' }]
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce(mockExistingPayment);

      const response = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPaymentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment already exists for this booking');
    });

    it('should require customer role', async () => {
      mockUser.role = 'vendor';

      const response = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPaymentData);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    it('should process successful payment webhook', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment_intent'
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send('test_body');

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should process failed payment webhook', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_payment_intent'
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send('test_body');

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });

    it('should process refund webhook', async () => {
      const mockEvent = {
        type: 'charge.refunded',
        data: {
          object: {
            payment_intent: 'pi_test_payment_intent'
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send('test_body');

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });

    it('should handle invalid webhook signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send('test_body');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Webhook Error: Invalid signature');
    });
  });

  describe('POST /api/v1/payments/:id/refund', () => {
    it('should process refund successfully', async () => {
      mockUser.role = 'vendor';
      const mockPayment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed',
        booking_id: '456e7890-e89b-12d3-a456-426614174000',
        stripe_payment_intent_id: 'pi_test_payment_intent'
      };

      const mockRefund = {
        id: 're_test_refund',
        amount: 50000,
        status: 'succeeded'
      };

      const mockBooking = {
        service_id: '789e0123-e89b-12d3-a456-426614174000',
        booking_date: '2024-12-25',
        start_time: '10:00',
        end_time: '14:00'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPayment] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rowCount: 1 });

      mockStripe.refunds.create.mockResolvedValueOnce(mockRefund);

      const response = await request(app)
        .post('/api/v1/payments/123e4567-e89b-12d3-a456-426614174000/refund')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reason: 'Customer request' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Refund processed successfully');
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: mockPayment.stripe_payment_intent_id,
        reason: 'Customer request'
      });
    });

    it('should reject refund for non-completed payment', async () => {
      mockUser.role = 'vendor';
      const mockPayment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'pending'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockPayment] });

      const response = await request(app)
        .post('/api/v1/payments/123e4567-e89b-12d3-a456-426614174000/refund')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reason: 'Customer request' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Can only refund completed payments');
    });

    it('should require vendor or admin role', async () => {
      mockUser.role = 'customer';

      const response = await request(app)
        .post('/api/v1/payments/123e4567-e89b-12d3-a456-426614174000/refund')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reason: 'Customer request' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/payments/stats/overview', () => {
    it('should return vendor payment statistics', async () => {
      mockUser.role = 'vendor';
      const mockStats = {
        total_payments: 20,
        completed_payments: 15,
        pending_payments: 3,
        failed_payments: 1,
        refunded_payments: 1,
        total_revenue: 7500.00,
        total_refunds: 500.00
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockStats] });

      const response = await request(app)
        .get('/api/v1/payments/stats/overview')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        ...mockStats,
        total_revenue: 7500.00,
        total_refunds: 500.00,
        net_revenue: 7000.00
      });
    });

    it('should require vendor or admin role', async () => {
      mockUser.role = 'customer';

      const response = await request(app)
        .get('/api/v1/payments/stats/overview')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/payments/payment-methods/:customerId', () => {
    it('should return customer payment methods for admin', async () => {
      mockUser.role = 'admin';
      const mockPaymentMethods = [
        {
          id: 'pm_test_method_1',
          type: 'card',
          card: { brand: 'visa', last4: '4242' }
        }
      ];

      mockStripe.paymentMethods.list.mockResolvedValueOnce({
        data: mockPaymentMethods
      });

      const response = await request(app)
        .get('/api/v1/payments/payment-methods/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPaymentMethods);
      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: '123e4567-e89b-12d3-a456-426614174000',
        type: 'card'
      });
    });

    it('should require admin role', async () => {
      mockUser.role = 'vendor';

      const response = await request(app)
        .get('/api/v1/payments/payment-methods/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(403);
    });
  });
});
