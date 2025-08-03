import express from 'express';
import { redis } from '../lib/redis';
import { UserSession } from '../models/user-session';

const router = express.Router();

router.get('/urls/auth/status', (req, res) => {
  const user = (req.session as UserSession).user;
  res.json({ authenticated: !!user, user });
});

router.post('/login', async (req, res) => {
  const sess = req.session as UserSession;
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const storedPassword = await redis.hGet('users', username);
    if (!storedPassword || storedPassword !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    sess.user = { username }; // FIXED here
    res.json({ success: true, user: { username } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

export default router;
