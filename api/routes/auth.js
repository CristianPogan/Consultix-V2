import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../auth.js';
import { getOrgId, findUserByEmail, createUser, validateSignupToken } from '../db.js';

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
      return res.status(400).json({ error: 'Email and password required', code: 'MISSING_FIELDS' });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }
    const orgId = String(user.org_id);
    const token = signToken({ orgId, userId: user.id });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name }, expiresIn: process.env.JWT_EXPIRES || '24h' });
  } catch (err) {
    console.error('auth login', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/validate-signup-token — validate access token for signup (public)
router.get('/validate-signup-token', async (req, res) => {
  try {
    const token = req.query.token?.trim();
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Access token required' });
    }
    const result = await validateSignupToken(token);
    if (!result) {
      return res.status(403).json({ valid: false, error: 'Invalid or expired access token' });
    }
    if (result.valid === false) {
      return res.status(403).json({ valid: false, error: result.reason || 'Access token is not valid' });
    }
    res.json({ valid: true, assignedCredits: result.assignedCredits });
  } catch (err) {
    console.error('auth validate-signup-token', err);
    res.status(500).json({ valid: false, error: err.message });
  }
});

// POST /api/auth/signup — create account → JWT (requires valid access token)
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, accessToken } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required', code: 'MISSING_FIELDS' });
    }
    if (!accessToken || !String(accessToken).trim()) {
      return res.status(400).json({ error: 'Access token required to create an account', code: 'MISSING_ACCESS_TOKEN' });
    }
    const tokenValidation = await validateSignupToken(accessToken);
    if (!tokenValidation) {
      return res.status(403).json({ error: 'Invalid or expired access token', code: 'INVALID_ACCESS_TOKEN' });
    }
    if (tokenValidation.valid === false) {
      return res.status(403).json({ error: tokenValidation.reason || 'Access token is not valid', code: 'INVALID_ACCESS_TOKEN' });
    }
    const trimmedEmail = email.toLowerCase().trim();
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters', code: 'WEAK_PASSWORD' });
    }
    const existing = await findUserByEmail(trimmedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_EXISTS' });
    }
    const orgId = await getOrgId();
    if (!orgId) {
      return res.status(503).json({ error: 'Signup not available. No organisation configured.', code: 'SIGNUP_UNAVAILABLE' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(trimmedEmail, passwordHash, name, String(orgId));
    const token = signToken({ orgId: user.org_id, userId: user.id });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name }, expiresIn: process.env.JWT_EXPIRES || '24h' });
  } catch (err) {
    console.error('auth signup', err);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
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
