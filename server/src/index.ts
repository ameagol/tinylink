import express from 'express';
import path from 'path';
import { createClient, RedisClientType } from 'redis';
import urlRoutes from './routes/urls';
import cors from 'cors';

interface Environment {
  REDIS_URL: string;
  PORT: number;
  NODE_ENV: string;
  CLIENT_BUILD_PATH?: string;
}

const env: Environment = {
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_BUILD_PATH: process.env.CLIENT_BUILD_PATH
};

const redis: RedisClientType = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
  }
});

const app = express();

// 1. Middleware
app.use(cors());
app.use(express.json());

// 2. API routes first
app.use('/api/urls', urlRoutes);
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'OK',
    redis: redis.isReady ? 'connected' : 'disconnected'
  });
});

// 3. Slug redirect comes BEFORE static React handler
app.get('/:slug', async (req, res, next) => {
  const slug = req.params.slug;

  // If slug has dots, it's probably a file, so skip
  if (slug.includes('.')) return next();

  try {
    const url = await redis.get(slug);
    console.log('/slug test', slug);

    if (!url) {
      return res.status(404).send('Short URL not found');
    }

    res.redirect(301, url);
  } catch (err) {
    console.error('Redirect error:', err);
    res.status(500).send('Internal server error');
  }
});

// 4. Serve static frontend (only in production)
if (env.NODE_ENV === 'production' && env.CLIENT_BUILD_PATH) {
  const buildPath = env.CLIENT_BUILD_PATH || path.join(__dirname, '../../client/build');
  app.use(express.static(buildPath));

  // 5. React fallback for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

async function startServer() {
  try {
    await redis.connect();
    console.log('Redis connected');

    app.listen(env.PORT, () => {
      console.log(`
        Server running in ${env.NODE_ENV} mode
        API: http://localhost:${env.PORT}/api
        Frontend: http://localhost:${env.PORT}
        Redis: ${env.REDIS_URL}
      `);
    });

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
}

startServer();