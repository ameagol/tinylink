import express from 'express';
import path from 'path';
import { createClient, RedisClientType } from 'redis';
import urlRoutes from './routes/urls';
import cors from 'cors';
import session from 'express-session';


interface Environment {
  REDIS_URL: string;
  PORT: number;
  NODE_ENV: string;
  CLIENT_BUILD_PATH?: string;
  SESSION_SECRET: string;
}

interface User {
  username: string;
  password: string;
}

interface CustomSessionData {
  user?: {
    username: string;
  };
}

const env: Environment = {
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_BUILD_PATH: process.env.CLIENT_BUILD_PATH,
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key'
};

const redis: RedisClientType = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
  }
});

const app = express();

async function seedUsers() {
  const exists = await redis.hExists('users', 'admin');
  if (!exists) {
    await redis.hSet('users', {
      admin: 'admin',
      user: 'user'
    });
    console.log('Users seeded into Redis.');
  }
}

// 1. Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Check auth status
app.get('/api/urls/auth/status', (req, res) => {
  const user = (req.session as any).user;
  if (user) {
    res.json({ authenticated: true, user });
  } else {
    res.json({ authenticated: false });
  }
});

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req.session as CustomSessionData).user;

  if (user) return next();

  // Return JSON for API routes
  if (req.path.startsWith('/api')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Fallback for non-API routes (optional)
  return res.status(401).send('Not authenticated');
}

// Login
app.post('/api/login', async (req, res) => {
  const sess = req.session as CustomSessionData;
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const storedPassword = await redis.hGet('users', username);

    if (!storedPassword || storedPassword !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    sess.user = { username };
    res.json({ success: true, user: username });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protect all other /api/urls routes
app.use('/api/urls', requireAuth, urlRoutes);


// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// 2. API routes first
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'OK',
    redis: redis.isReady ? 'connected' : 'disconnected'
  });
});

// 3. Slug redirect comes BEFORE static React handler
app.get('/:slug', async (req, res, next) => {
  const slug = req.params.slug;

  console.log('slug passed', slug);

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

    await seedUsers();

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

if (require.main === module) {
  startServer();
}

export { app, redis };