const request = require('supertest');
const app = require('../src/server');

describe('Server', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Auth Routes', () => {
    it('should have auth health endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/auth/health')
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
      expect(response.body).toHaveProperty('path');
    });
  });
});
