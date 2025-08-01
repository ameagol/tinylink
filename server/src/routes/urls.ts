import express from 'express';
import { shortenUrl, getUrl, getAllUrls } from '../services/redis.service';

const router = express.Router();

// Shorten URL
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    
    const slug = await shortenUrl(url);
    res.json({ 
      shortUrl: `${req.headers.host}/${slug}`,
      originalUrl: url 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to shorten URL' });
  }
});

// Redirect (handled by Express)
router.get('/:slug', async (req, res) => {
  const url = await getUrl(req.params.slug);
  if (!url) return res.status(404).send('Not Found');
  res.redirect(301, url);
});

// Admin view (all URLs)
router.get('/', async (req, res) => {
  try {
    const urls = await getAllUrls();
    res.json(urls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

export default router;