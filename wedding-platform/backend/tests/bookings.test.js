const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');

// Mock the database pool and JWT
jest.mock('../src/config/database');
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

describe('Bookings Routes', () => {
  let mockPool;
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/bookings', () => {
    it('should return customer bookings for customer role', async () => {
      const mockBookings = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          service_name: 'Wedding Photography',
          vendor_name: 'Photo Pro',
          status: 'confirmed'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockBookings });

      const response = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBookings);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT b.*, s.name as service_name'),
        [mockUser.id]
      );
    });

    it('should return vendor bookings for vendor role', async () => {
      mockUser.role = 'vendor';
      const mockBookings = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          service_name: 'Wedding Photography',
          customer_email: 'customer@example.com'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockBookings });

      const response = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBookings);
    });

    it('should return all bookings for admin role', async () => {
      mockUser.role = 'admin';
      const mockBookings = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          service_name: 'Wedding Photography',
          vendor_name: 'Photo Pro',
          customer_email: 'customer@example.com'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockBookings });

      const response = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBookings);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch bookings');
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    it('should return a specific booking for customer', async () => {
      const mockBooking = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        service_name: 'Wedding Photography',
        vendor_name: 'Photo Pro'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockBooking] });

      const response = await request(app)
        .get('/api/v1/bookings/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBooking);
    });

    it('should return 404 for non-existent booking', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/bookings/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Booking not found');
    });

    it('should validate UUID parameter', async () => {
      const response = await request(app)
        .get('/api/v1/bookings/invalid-uuid')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/bookings', () => {
    const validBookingData = {
      service_id: '123e4567-e89b-12d3-a456-426614174000',
      booking_date: '2024-12-25',
      start_time: '10:00',
      end_time: '14:00',
      special_requests: 'Outdoor ceremony photos',
      total_amount: 500.00
    };

    it('should create a new booking successfully', async () => {
      const mockService = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        vendor_id: '456e7890-e89b-12d3-a456-426614174000',
        name: 'Wedding Photography'
      };

      const mockVendor = { is_verified: true };
      const mockAvailability = [{ id: '789e0123-e89b-12d3-a456-426614174000' }];
      const mockExistingBooking = { rows: [] };
      const mockNewBooking = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...validBookingData
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockService] })
        .mockResolvedValueOnce({ rows: [mockVendor] })
        .mockResolvedValueOnce({ rows: mockAvailability })
        .mockResolvedValueOnce(mockExistingBooking)
        .mockResolvedValueOnce({ rows: [mockNewBooking] })
        .mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validBookingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Booking created successfully');
      expect(response.body.data).toEqual(mockNewBooking);
    });

    it('should reject booking with unverified vendor', async () => {
      const mockService = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        vendor_id: '456e7890-e89b-12d3-a456-426614174000',
        name: 'Wedding Photography'
      };

      const mockVendor = { is_verified: false };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockService] })
        .mockResolvedValueOnce({ rows: [mockVendor] });

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validBookingData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot book with unverified vendor');
    });

    it('should reject booking for unavailable time slot', async () => {
      const mockService = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        vendor_id: '456e7890-e89b-12d3-a456-426614174000',
        name: 'Wedding Photography'
      };

      const mockVendor = { is_verified: true };
      const mockAvailability = { rows: [] };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockService] })
        .mockResolvedValueOnce({ rows: [mockVendor] })
        .mockResolvedValueOnce(mockAvailability);

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validBookingData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Requested time slot is not available');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        service_id: 'invalid-uuid',
        booking_date: 'invalid-date',
        start_time: '25:00',
        end_time: '26:00'
      };

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PATCH /api/v1/bookings/:id/status', () => {
    it('should update booking status successfully', async () => {
      mockUser.role = 'vendor';
      const mockBooking = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        service_id: '456e7890-e89b-12d3-a456-426614174000',
        booking_date: '2024-12-25',
        start_time: '10:00',
        end_time: '14:00'
      };

      const updatedBooking = { ...mockBooking, status: 'confirmed' };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: [updatedBooking] });

      const response = await request(app)
        .patch('/api/v1/bookings/123e4567-e89b-12d3-a456-426614174000/status')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ status: 'confirmed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Booking status updated successfully');
    });

    it('should reject invalid status', async () => {
      mockUser.role = 'vendor';

      const response = await request(app)
        .patch('/api/v1/bookings/123e4567-e89b-12d3-a456-426614174000/status')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status');
    });
  });

  describe('PUT /api/v1/bookings/:id', () => {
    it('should update booking details successfully', async () => {
      const mockBooking = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'pending',
        service_id: '456e7890-e89b-12d3-a456-426614174000',
        booking_date: '2024-12-25',
        start_time: '10:00',
        end_time: '14:00'
      };

      const updatedData = {
        booking_date: '2024-12-26',
        start_time: '11:00',
        end_time: '15:00',
        special_requests: 'Updated requests',
        total_amount: 600.00
      };

      const updatedBooking = { ...mockBooking, ...updatedData };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: [{ id: '789e0123-e89b-12d3-a456-426614174000' }] })
        .mockResolvedValueOnce({ rows: [updatedBooking] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/bookings/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Booking updated successfully');
    });

    it('should reject update for completed booking', async () => {
      const mockBooking = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockBooking] });

      const response = await request(app)
        .put('/api/v1/bookings/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ booking_date: '2024-12-26' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot update booking with status: completed');
    });
  });

  describe('DELETE /api/v1/bookings/:id', () => {
    it('should cancel booking successfully', async () => {
      const mockBooking = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'pending',
        service_id: '456e7890-e89b-12d3-a456-426614174000',
        booking_date: '2024-12-25',
        start_time: '10:00',
        end_time: '14:00'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .delete('/api/v1/bookings/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Booking cancelled successfully');
    });

    it('should reject cancellation of completed booking', async () => {
      const mockBooking = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockBooking] });

      const response = await request(app)
        .delete('/api/v1/bookings/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot cancel booking with status: completed');
    });
  });

  describe('GET /api/v1/bookings/stats/overview', () => {
    it('should return vendor booking statistics', async () => {
      mockUser.role = 'vendor';
      const mockStats = {
        total_bookings: 10,
        pending_bookings: 2,
        confirmed_bookings: 5,
        completed_bookings: 3,
        total_revenue: 1500.00
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockStats] });

      const response = await request(app)
        .get('/api/v1/bookings/stats/overview')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should require vendor or admin role', async () => {
      mockUser.role = 'customer';

      const response = await request(app)
        .get('/api/v1/bookings/stats/overview')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(403);
    });
  });
});
