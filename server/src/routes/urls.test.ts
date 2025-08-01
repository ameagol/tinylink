jest.mock('../services/redis.service', () => ({
    shortenUrl: jest.fn(),
    getUrl: jest.fn(),
    getAllUrls: jest.fn(),
  }));
  
  import request from 'supertest';
  import { app } from '../index';
  import * as redisService from '../services/redis.service';
  
  describe('URL Routes', () => {
    const shortenUrlMock = redisService.shortenUrl as jest.Mock;
    const getUrlMock = redisService.getUrl as jest.Mock;
    const getAllUrlsMock = redisService.getAllUrls as jest.Mock;
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should shorten a URL on POST /api/urls', async () => {
      shortenUrlMock.mockResolvedValue('slug321');
  
      const res = await request(app).post('/api/urls').send({ url: 'https://mockurl.com' });
  
      expect(res.status).toBe(200);
      expect(res.body.shortUrl).toMatch(/slug321/);
      expect(res.body.originalUrl).toBe('https://mockurl.com');
    });
  
    it('should return 400 if no URL is provided', async () => {
      const res = await request(app).post('/api/urls').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('URL is required');
    });
  
    it('should redirect to original URL on GET /api/urls/:slug', async () => {
      getUrlMock.mockResolvedValue('https://mockurl.com');
  
      const res = await request(app).get('/api/urls/slug321');
  
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('https://mockurl.com');
    });
  
    it('should return all URLs on GET /api/urls', async () => {
      getAllUrlsMock.mockResolvedValue([
        { slug: 'slug321', originalUrl: 'https://mockurl.com' }
      ]);
  
      const res = await request(app).get('/api/urls');
  
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('slug', 'slug321');
    });
  });
  