import request from 'supertest';
import express from 'express';
import router from './urls';  // ajuste o caminho conforme seu projeto

// Mock dos serviços
jest.mock('../services/redis.service', () => ({
  shortenUrl: jest.fn(),
  getAllUrls: jest.fn(),
}));

import { shortenUrl, getAllUrls } from '../services/redis.service';

describe('URL Routes', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    app.use((req, _res, next) => {

      (req as any).session = {
        user: {
          username: 'testuser'
        }
      };
      next();
    });
    app.use('/', router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /', () => {
    it('should return 401 if no user in session', async () => {

      const appNoSession = express();
      appNoSession.use(express.json());
      appNoSession.use('/', router);

      const res = await request(appNoSession)
        .post('/')
        .send({ url: 'http://example.com' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 if url is missing', async () => {
      const res = await request(app)
        .post('/')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'URL is required' });
    });

    it('should return 400 if customSlug invalid', async () => {
      const res = await request(app)
        .post('/')
        .send({ url: 'http://example.com', customSlug: 'invalid_slug!' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Custom slug must be 1-8 letters or digits only' });
    });

    it('should call shortenUrl and return slug on success', async () => {
      (shortenUrl as jest.Mock).mockResolvedValue('abc123');

      const res = await request(app)
        .post('/')
        .send({ url: 'http://example.com', customSlug: 'abc123' });

      expect(shortenUrl).toHaveBeenCalledWith('http://example.com', 'abc123', 'testuser');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ slug: 'abc123', originalUrl: 'http://example.com' });
    });

    it('should return 500 if shortenUrl throws', async () => {
      (shortenUrl as jest.Mock).mockRejectedValue(new Error('Fail'));

      const res = await request(app)
        .post('/')
        .send({ url: 'http://example.com' });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to shorten URL' });
    });
  });

  describe('GET /', () => {
    it('should return 401 if no user in session', async () => {
      const appNoSession = express();
      appNoSession.use(express.json());
      appNoSession.use('/', router);

      const res = await request(appNoSession).get('/');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('should call getAllUrls and return urls on success', async () => {
      const fakeUrls = [{ slug: 'abc123', url: 'http://example.com', hits: 0, owner: 'testuser' }];
      (getAllUrls as jest.Mock).mockResolvedValue(fakeUrls);

      const res = await request(app).get('/');

      expect(getAllUrls).toHaveBeenCalledWith('testuser');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(fakeUrls);
    });

    it('should return 500 if getAllUrls throws', async () => {
      (getAllUrls as jest.Mock).mockRejectedValue(new Error('Fail'));

      const res = await request(app).get('/');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch URLs' });
    });
  });
});
