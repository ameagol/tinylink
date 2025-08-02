import express from 'express';
import { shortenUrl, getUrl, getAllUrls } from '../services/redis.service';

interface CustomSessionData {
  user?: {
    username: string;
  };
}

const router = express.Router();

// Auth middleware
function isAuthenticated(req: express.Request): req is express.Request & { session: CustomSessionData } {
  return !!(req.session as CustomSessionData).user;
}

// Shorten URL (protected)
router.post('/', async (req, res) => {
  const session = req.session as unknown as CustomSessionData;

  if (!session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { url, customSlug } = req.body;
    console.log('url', url);
    console.log('customSlug', customSlug);
    if (!url) return res.status(400).json({ error: 'URL is required' });

    if (customSlug && !/^[a-zA-Z0-9]{1,8}$/.test(customSlug)) {
      return res.status(400).json({ error: 'Custom slug must be 1-8 letters or digits only' });
    }

    const slug = await shortenUrl(url, customSlug);
    res.json({ slug, originalUrl: url });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get all URLs (protected)
router.get('/', async (req, res) => {
  const session = req.session as unknown as CustomSessionData;
  if (!session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const urls = await getAllUrls();
    res.json(urls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

// Public redirect
router.get('/:slug', async (req, res) => {
  const url = await getUrl(req.params.slug);
  if (!url) return res.status(404).send('Not Found');
  res.redirect(301, url);
});

export default router;
