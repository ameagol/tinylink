import express from 'express';
import { shortenUrl, getUrl, getAllUrls } from '../services/redis.service';

interface CustomSessionData {
  user?: {
    username: string;
  };
}

const router = express.Router();

// Shorten URL (protected)
router.post('/', async (req, res) => {
  const user = (req.session as CustomSessionData)?.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { url, customSlug } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required' });

    if (customSlug && !/^[a-zA-Z0-9]{1,8}$/.test(customSlug)) {
      return res.status(400).json({ error: 'Custom slug must be 1-8 letters or digits only' });
    }

    const slug = await shortenUrl(url, customSlug, user.username);
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
    const allUrls = await getAllUrls();
    const userUrls = allUrls.filter((url) => url.owner === session.user?.username);
    res.json(userUrls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

export default router;
