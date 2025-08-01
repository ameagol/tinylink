jest.mock('redis', () => {
    return {
      createClient: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        quit: jest.fn().mockResolvedValue(undefined),
        get: jest.fn((key: string) => {
          if (key === 'exists') return Promise.resolve('https://example.com');
          return Promise.resolve(null);
        }),
        isReady: true,
        on: jest.fn(),
      }))
    };
  });
  
  import request from 'supertest';
  import { app } from './index';
  import { redis } from '../src/services/redis.service';
  
  describe('Express Server', () => {
    describe('GET /api/health', () => {
      it('should return OK and redis status', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          status: 'OK',
          redis: 'connected'
        });
      });
    });
  
    describe('GET /:slug', () => {
      it('should redirect if slug exists in Redis', async () => {
        const res = await request(app).get('/exists');
        expect(res.status).toBe(301);
        expect(res.headers.location).toBe('https://example.com');
      });
  
      it('should return 404 if slug not found', async () => {
        const res = await request(app).get('/notfound');
        expect(res.status).toBe(404);
        expect(res.text).toBe('Short URL not found');
      });
    });
  
    afterAll(async () => {
      await redis.quit();
    });
  });
  