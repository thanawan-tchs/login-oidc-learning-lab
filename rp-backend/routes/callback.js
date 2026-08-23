import { Router } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { pendingLogins, sessions } from '../lib/sessionStore.js';
import { randomToken } from '../lib/pkce.js';
import { OP_ISSUER, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, FRONTEND_ORIGIN } from '../lib/config.js';
import { log } from '../lib/log.js';

// Cached against the OP's published keys — refetched automatically if the
// kid we need isn't in the cache yet.
const JWKS = createRemoteJWKSet(new URL(`${OP_ISSUER}/.well-known/jwks.json`));

const router = Router();

router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    log('RP-backend', 'OP redirected back with an error', { error, error_description });
    return res.status(400).send(`Login failed: ${error} — ${error_description || ''}`);
  }

  const pending = await pendingLogins.get(state);
  if (!pending) {
    return res.status(400).send('Unknown or expired state (possible CSRF, or this page was reloaded).');
  }
  await pendingLogins.delete(state);

  log('RP-backend', 'received code from OP, exchanging at /token', { state });

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: pending.code_verifier,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  log('RP-backend -> OP', 'POST /token', { grant_type: 'authorization_code', client_id: CLIENT_ID });

  const tokenRes = await fetch(`${OP_ISSUER}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tokens = await tokenRes.json();

  if (!tokenRes.ok) {
    log('RP-backend <- OP', `${tokenRes.status} error`, tokens);
    return res.status(400).send(`Token exchange failed: ${tokens.error} — ${tokens.error_description || ''}`);
  }
  log('RP-backend <- OP', '200 ok', { hasIdToken: Boolean(tokens.id_token), hasRefreshToken: Boolean(tokens.refresh_token) });

  const { payload: claims } = await jwtVerify(tokens.id_token, JWKS, {
    issuer: OP_ISSUER,
    audience: CLIENT_ID,
  });

  if (claims.nonce !== pending.nonce) {
    log('RP-backend', 'REJECTED: id_token nonce does not match the one this login started with');
    return res.status(400).send('id_token nonce mismatch — refusing to start a session.');
  }

  const sid = randomToken(16);
  await sessions.set(sid, {
    claims,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    createdAt: Date.now(),
  });

  log('RP-backend', `RP session ${sid} created`, { sub: claims.sub });

  res.cookie('rp_session', sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  res.redirect(`${FRONTEND_ORIGIN}/result`);
});

export default router;
