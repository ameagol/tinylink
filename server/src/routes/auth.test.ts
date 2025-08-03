import request from 'supertest';
import express from 'express';
import session from 'express-session';
import router from '../routes/urls'
import { redis } from '../lib/redis';

// Mock Redis
jest.mock('../lib/redis', () => ({
  redis: {
    keys: jest.fn().mockResolvedValue([]),
    mGet: jest.fn().mockResolvedValue([]),
    exists: jest.fn().mockResolvedValue(0),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
  },
}));

const mockRedis = redis as jest.Mocked<typeof redis>;

describe('URL Routes', () => {
  const app = express();
  app.use(express.json());
  
  // Setup session middleware
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }
    })
  );

  // Add mock login route for testing
  app.post('/login', (req, res) => {
    if (req.body.username === 'testuser') {
      // Mock session data
      (req.session as any).user = { username: 'testuser' };
      return res.status(200).send('Logged in');
    }
    res.status(401).send('Unauthorized');
  });

  app.use(router);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET / - should call getAllUrls and return urls on success', async () => {
    // Mock Redis responses
    mockRedis.keys.mockResolvedValue(['slug1', 'slug2']);
    mockRedis.mGet.mockResolvedValue([
      JSON.stringify({ slug: 'slug1', url: 'https://example.com', hits: 0, owner: 'testuser' }),
      JSON.stringify({ slug: 'slug2', url: 'https://example.org', hits: 5, owner: 'testuser' })
    ]);

    const agent = request.agent(app);

    // First log in to establish session
    await agent
      .post('/login')
      .send({ username: 'testuser' });

    // Make the request
    const response = await agent.get('/');

    // Verify Redis was called correctly
    expect(mockRedis.keys).toHaveBeenCalledWith('*');
    expect(mockRedis.mGet).toHaveBeenCalledWith(['slug1', 'slug2']);

    // Verify the response
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { slug: 'slug1', url: 'https://example.com', hits: 0, owner: 'testuser' },
      { slug: 'slug2', url: 'https://example.org', hits: 5, owner: 'testuser' }
    ]);
  });

  test('GET / - should return only URLs owned by the user', async () => {
    // Mock Redis responses with mixed ownership
    mockRedis.keys.mockResolvedValue(['slug1', 'slug2', 'slug3']);
    mockRedis.mGet.mockResolvedValue([
      JSON.stringify({ slug: 'slug1', url: 'https://example.com', hits: 0, owner: 'testuser' }),
      JSON.stringify({ slug: 'slug2', url: 'https://example.org', hits: 5, owner: 'otheruser' }),
      JSON.stringify({ slug: 'slug3', url: 'https://example.net', hits: 3, owner: 'testuser' })
    ]);

    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'testuser' });

    const response = await agent.get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { slug: 'slug1', url: 'https://example.com', hits: 0, owner: 'testuser' },
      { slug: 'slug3', url: 'https://example.net', hits: 3, owner: 'testuser' }
    ]);
  });

  test('GET / - should return 401 if not authenticated', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });
});