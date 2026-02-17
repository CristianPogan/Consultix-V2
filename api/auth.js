import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_API_KEY = process.env.JWT_API_KEY || process.env.API_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  // OAuth callbacks are hit by redirects (no Authorization header)
  if (req.method === 'GET' && req.path === '/api/integrations/google-calendar/callback') {
    return next();
  }
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Authorization: Bearer <token>' });
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.orgId = payload.orgId;
  req.userId = payload.userId;
  next();
}
