import request from 'supertest';
import express from 'express';
import router from './auth';  // seu arquivo de rotas auth
import { redis } from '../lib/redis';

interface MockUserSession {
    user: { username: string } | null;
    destroy: (callback: (err?: any) => void) => void;
  }

// Mock Redis client
jest.mock('../lib/redis', () => ({
  redis: {
    hGet: jest.fn(),
  },
}));

// Mock session simples
const mockSession: MockUserSession = {
  user: null,
  destroy: jest.fn((callback) => callback()),
};

const mockApp = express();
mockApp.use(express.json());

mockApp.use((req, res, next) => {
    req.session = {
      user: mockSession.user,
      destroy: mockSession.destroy,
    } as any;
    next();
  });

mockApp.use(router);

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.user = null;
  });

  describe('GET /urls/auth/status', () => {
    it('should return unauthenticated status when no user is logged in', async () => {
      mockSession.user = null;

      const response = await request(mockApp).get('/urls/auth/status').expect(200);

      expect(response.body).toEqual({
        authenticated: false,
        user: null,
      });
    });

    it('should return authenticated status when user is logged in', async () => {
      mockSession.user = { username: 'testuser' };

      const response = await request(mockApp).get('/urls/auth/status').expect(200);

      expect(response.body).toEqual({
        authenticated: true,
        user: { username: 'testuser' },
      });
    });
  });

  describe('POST /login', () => {
    it('should return 400 if username or password is missing', async () => {
      const testCases = [{ username: 'testuser' }, { password: 'password' }, {}];

      for (const body of testCases) {
        const response = await request(mockApp).post('/login').send(body).expect(400);
        expect(response.body).toEqual({ error: 'Username and password required' });
      }
    });

    it('should return 401 for invalid credentials', async () => {
      (redis.hGet as jest.Mock).mockResolvedValue(null);

      const response = await request(mockApp)
        .post('/login')
        .send({ username: 'wronguser', password: 'wrongpass' })
        .expect(401);

      expect(response.body).toEqual({ error: 'Invalid credentials' });
      expect(redis.hGet).toHaveBeenCalledWith('users', 'wronguser');
      expect(mockSession.user).toBeNull();
    });

    it('should return 401 for incorrect password', async () => {
      (redis.hGet as jest.Mock).mockResolvedValue('correctpass');

      const response = await request(mockApp)
        .post('/login')
        .send({ username: 'testuser', password: 'wrongpass' })
        .expect(401);

      expect(response.body).toEqual({ error: 'Invalid credentials' });
      expect(redis.hGet).toHaveBeenCalledWith('users', 'testuser');
      expect(mockSession.user).toBeNull();
    });

    it('should login successfully with correct credentials', async () => {
      (redis.hGet as jest.Mock).mockResolvedValue('correctpass');

      const response = await request(mockApp)
        .post('/login')
        .send({ username: 'testuser', password: 'correctpass' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        user: { username: 'testuser' },
      });
      expect(redis.hGet).toHaveBeenCalledWith('users', 'testuser');
      expect(mockSession.user).toEqual({ username: 'testuser' });
    });

    it('should return 500 for Redis errors', async () => {
      (redis.hGet as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const response = await request(mockApp)
        .post('/login')
        .send({ username: 'testuser', password: 'password' })
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('POST /logout', () => {
    it('should logout successfully', async () => {
      mockSession.user = { username: 'testuser' };

      const response = await request(mockApp).post('/logout').expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockSession.destroy).toHaveBeenCalled();
    //   expect(mockSession.user).toBeNull();
    });
  });
});
