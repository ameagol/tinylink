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
    
      const res = await request(app)
        .post('/api/urls')
        .send({ url: 'https://mockurl.com' });
    
      expect(res.status).toBe(200);
      expect(shortenUrlMock).toHaveBeenCalledWith('https://mockurl.com', undefined);
      expect(res.body).toEqual({
        slug: 'slug321',
        originalUrl: 'https://mockurl.com'
      });
    });

    it('should accept a custom slug and store it if available', async () => {
      shortenUrlMock.mockResolvedValue('custom12');
    
      const res = await request(app)
        .post('/api/urls')
        .send({ url: 'https://mockurl.com', customSlug: 'custom12' });
    
      expect(res.status).toBe(200);
      expect(shortenUrlMock).toHaveBeenCalledWith('https://mockurl.com', 'custom12');
      expect(res.body).toEqual({
        slug: 'custom12',
        originalUrl: 'https://mockurl.com'
      });
    });

    it('should return 500 if custom slug already exists', async () => {
      shortenUrlMock.mockImplementation(() => {
        throw new Error('Custom slug already exists');
      });
    
      const res = await request(app)
        .post('/api/urls')
        .send({ url: 'https://mockurl.com', customSlug: 'dupSlug1' });
    
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Custom slug already exists');
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
  