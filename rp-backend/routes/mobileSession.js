import { Router } from 'express';
import { mobileHandoffs, sessions } from '../lib/sessionStore.js';
import { log } from '../lib/log.js';

const router = Router();

// The mobile app calls this exactly once, right after the in-app browser
// hands it back a ?handoff= code via the deep link. Trades that one-time
// code for the actual session — the session id itself doubles as the
// bearer token used on every later /me and /logout call.
router.get('/mobile/session', async (req, res) => {
  const { handoff } = req.query;
  const sid = handoff && (await mobileHandoffs.get(handoff));

  log('RP-backend', 'GET /mobile/session', { hasHandoff: Boolean(handoff), found: Boolean(sid) });

  if (!sid) return res.status(400).json({ error: 'invalid_or_expired_handoff' });
  await mobileHandoffs.delete(handoff);

  const session = await sessions.get(sid);
  if (!session) return res.status(400).json({ error: 'session_not_found' });

  res.json({
    sessionToken: sid,
    claims: session.claims,
    accessToken: session.accessToken,
    hasRefreshToken: Boolean(session.refreshToken),
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
  });
});

export default router;
