jest.mock('redis', () => {
  return {
    createClient: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      get: jest.fn((key: string) => {
        if (key === 'exists') return Promise.resolve('https://example.com');
        if (key === 'error') return Promise.reject(new Error('Redis error'));
        return Promise.resolve(null);
      }),
      hGet: jest.fn((hash: string, key: string) => {
        if (hash === 'users' && key === 'admin') return Promise.resolve('admin');
        if (hash === 'users' && key === 'user') return Promise.resolve('user');
        return Promise.resolve(null);
      }),
      hExists: jest.fn().mockResolvedValue(false),
      hSet: jest.fn().mockResolvedValue(1),
      isReady: true,
      on: jest.fn(),
    }))
  };
});

import request from 'supertest';
import { app } from './index';
import { redis } from './index';
import session from 'express-session';

describe('Express Server', () => {
  let agent: request.SuperTest<request.Test>;

  beforeEach(() => {
    agent = request.agent(app); // Use agent to maintain session
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('GET /api/health', () => {
    it('should return OK and redis status', async () => {
      const res = await agent.get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'OK',
        redis: 'connected'
      });
    });
  });

  describe('Authentication', () => {
    describe('POST /api/login', () => {
      it('should login with valid credentials', async () => {
        const res = await agent
          .post('/api/login')
          .send({ username: 'admin', password: 'admin' });
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user).toBe('admin');
      });

      it('should set session cookie on successful login', async () => {
        const res = await agent
          .post('/api/login')
          .send({ username: 'admin', password: 'admin' });
        
        expect(res.headers['set-cookie']).toBeDefined();
      });

      it('should return 401 with invalid credentials', async () => {
        const res = await agent
          .post('/api/login')
          .send({ username: 'admin', password: 'wrong' });
        
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid credentials');
      });

      it('should return 400 when missing credentials', async () => {
        const res1 = await agent.post('/api/login').send({ username: 'admin' });
        const res2 = await agent.post('/api/login').send({ password: 'admin' });
        
        expect(res1.status).toBe(400);
        expect(res2.status).toBe(400);
        expect(res1.body.error).toBe('Username and password required');
      });
    });

    describe('GET /api/urls/auth/status', () => {
      it('should return authenticated false when not logged in', async () => {
        const res = await agent.get('/api/urls/auth/status');
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(false);
      });

      it('should return authenticated true when logged in', async () => {
        // First login
        await agent
          .post('/api/login')
          .send({ username: 'admin', password: 'admin' });
        
        const res = await agent.get('/api/urls/auth/status');
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(true);
        expect(res.body.user.username).toBe('admin');
      });
    });

    describe('POST /api/logout', () => {
      it('should logout successfully', async () => {
        // First login
        await agent
          .post('/api/login')
          .send({ username: 'admin', password: 'admin' });
        
        const logoutRes = await agent.post('/api/logout');
        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body.success).toBe(true);

        // Verify session is cleared
        const statusRes = await agent.get('/api/urls/auth/status');
        expect(statusRes.body.authenticated).toBe(false);
      });
    });
  });

  describe('GET /:slug', () => {
    it('should redirect if slug exists in Redis', async () => {
      const res = await agent.get('/exists');
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('https://example.com');
    });

    it('should return 404 if slug not found', async () => {
      const res = await agent.get('/notfound');
      expect(res.status).toBe(404);
      expect(res.text).toBe('Short URL not found');
    });

    it('should skip redirect if slug contains a dot', async () => {
      const res = await agent.get('/file.txt');
      // This should fall through to the next middleware
      expect(res.status).not.toBe(301);
    });

    it('should return 500 on Redis error', async () => {
      const res = await agent.get('/error');
      expect(res.status).toBe(500);
      expect(res.text).toBe('Internal server error');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown API routes', async () => {
      const res = await agent.get('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});