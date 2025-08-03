import express from 'express';
import { shortenUrl, getAllUrls } from '../services/redis.service';
import { UserSession } from '../models/user-session';

const router = express.Router();

router.post('/', async (req, res) => {
  const user = (req.session as UserSession)?.user;

  if (!user || !user.username) {
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
    res.status(500).json({ error: 'Failed to shorten URL' });
  }
});

router.get('/', async (req, res) => {
  const user = (req.session as UserSession)?.user;

  if (!user || !user.username) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const urls = await getAllUrls(user.username);
    res.json(urls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

export default router;
