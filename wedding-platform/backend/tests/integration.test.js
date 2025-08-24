const request = require('supertest');
const app = require('../src/server');

describe('API Integration Tests', () => {
  describe('Public Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Route not found');
    });
  });

  describe('Authentication Endpoints', () => {
    it('should have auth health endpoint', async () => {
      const response = await request(app).get('/api/v1/auth/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Auth service is running');
    });

    it('should reject registration without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject login without credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Protected Endpoints', () => {
    it('should reject access to protected routes without token', async () => {
      const response = await request(app).get('/api/v1/users/profile');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Access token required');
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });
  });
});





