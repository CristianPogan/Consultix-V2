import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../auth.js';
import { getOrgId, findUserByEmail, createUser } from '../db.js';

const router = Router();

// POST /api/auth/token — exchange API key for JWT (legacy / API access)
router.post('/token', async (req, res) => {
  try {
    const { apiKey } = req.body || {};
    const expectedKey = process.env.JWT_API_KEY || process.env.API_SECRET;
    if (!expectedKey) {
      return res.status(503).json({ error: 'Auth not configured. Set JWT_API_KEY or API_SECRET.' });
    }
    if (apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    const orgId = await getOrgId();
    if (!orgId) {
      return res.status(503).json({ error: 'No organisation configured. Set DEMO_ORG_ID or ensure organisations table has data.' });
    }
    const token = signToken({ orgId });
    res.json({ token, expiresIn: process.env.JWT_EXPIRES || '24h' });
  } catch (err) {
    console.error('auth token', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — email + password → JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const orgId = String(user.org_id);
    const token = signToken({ orgId, userId: user.id });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name }, expiresIn: process.env.JWT_EXPIRES || '24h' });
  } catch (err) {
    console.error('auth login', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signup — create account → JWT
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }
    const trimmedEmail = email.toLowerCase().trim();
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await findUserByEmail(trimmedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const orgId = await getOrgId();
    if (!orgId) {
      return res.status(503).json({ error: 'Signup not available. No organisation configured.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(trimmedEmail, passwordHash, name, String(orgId));
    const token = signToken({ orgId: user.org_id, userId: user.id });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name }, expiresIn: process.env.JWT_EXPIRES || '24h' });
  } catch (err) {
    console.error('auth signup', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — verify token, return user (for session check)
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const token = auth.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    if (!payload.orgId) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    res.json({ user: { orgId: payload.orgId, userId: payload.userId }, valid: true });
  } catch (err) {
    console.error('auth me', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
