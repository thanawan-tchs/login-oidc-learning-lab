import { Router } from 'express';
import { sessions } from '../lib/sessionStore.js';
import { log } from '../lib/log.js';

const router = Router();

// The only endpoint the React app calls directly. It never sees the token
// exchange itself — it just asks "what does my session say?" and we answer
// from the RP's own session store (Redis).
router.get('/me', async (req, res) => {
  const sid = req.cookies.rp_session;
  const session = sid && (await sessions.get(sid));

  log('RP-backend', 'GET /me', { hasSession: Boolean(session) });

  if (!session) return res.status(401).json({ error: 'no_session' });

  res.json({
    claims: session.claims,
    accessToken: session.accessToken,
    hasRefreshToken: Boolean(session.refreshToken),
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
  });
});

export default router;
