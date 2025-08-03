import express from 'express';
import cors from 'cors';
import path from 'path';
import sessionMiddleware, { requireAuth } from './middleware/session';
import authRoutes from './routes/auth';
import urlRoutes from './routes/urls';
import { redis } from './lib/redis';

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_BUILD_PATH = process.env.CLIENT_BUILD_PATH;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);

app.use('/api/urls', requireAuth, urlRoutes);
app.use('/api', authRoutes);

app.get('/api/health', async (_, res) => {
  res.json({ status: 'OK', redis: redis.isReady ? 'connected' : 'disconnected' });
});

app.get('/:slug', async (req, res, next) => {
  const slug = req.params.slug;

  // ignore favicon etc
  if (slug.includes('.')) return next();

  try {
    const dataStr = await redis.get(slug);

    if (!dataStr) return res.status(404).send('Short URL not found');

    const urlData = JSON.parse(dataStr);

    urlData.hits = (urlData.hits || 0) + 1;

    await redis.set(slug, JSON.stringify(urlData));
    res.redirect(302, urlData.url);
    
  } catch (err) {
    console.error('Redirect error:', err);
    res.status(500).send('Internal server error');
  }
});

if (NODE_ENV === 'production' && CLIENT_BUILD_PATH) {
  const buildPath = CLIENT_BUILD_PATH || path.join(__dirname, '../../client/build');
  app.use(express.static(buildPath));
  app.get('*', (_, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

export { app };
