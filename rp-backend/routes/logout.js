import { Router } from 'express';
import { sessions } from '../lib/sessionStore.js';
import { OP_ISSUER, POST_LOGOUT_REDIRECT_URI } from '../lib/config.js';
import { log } from '../lib/log.js';

const router = Router();

// Clears only the RP's own session. Returns the OP's logout URL rather than
// redirecting itself, so the browser (not this JSON API) makes the actual
// navigation that kills the OP's SSO session too.
router.post('/logout', async (req, res) => {
  const sid = req.cookies.rp_session;
  const session = sid && (await sessions.get(sid));
  if (sid) await sessions.delete(sid);
  res.clearCookie('rp_session');

  log('RP-backend', `RP session ${sid || '(none)'} cleared`);

  const url = new URL(`${OP_ISSUER}/logout`);
  if (session?.idToken) url.searchParams.set('id_token_hint', session.idToken);
  url.searchParams.set('post_logout_redirect_uri', POST_LOGOUT_REDIRECT_URI);

  res.json({ opLogoutUrl: url.toString() });
});

export default router;
