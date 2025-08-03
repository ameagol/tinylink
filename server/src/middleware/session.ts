import session from 'express-session';
import { Request, Response, NextFunction } from 'express';
import { UserSession } from '../models/user-session';

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req.session as UserSession).user;
  console.log('RequireAuth check:', user);
  if (user) return next();
  if (req.path.startsWith('/api')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.status(401).send('Not authenticated');
}

export default sessionMiddleware;
