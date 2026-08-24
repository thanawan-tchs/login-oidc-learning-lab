import { Router } from 'express';
import { generatePkcePair, randomToken } from '../lib/pkce.js';
import { pendingLogins } from '../lib/sessionStore.js';
import { OP_ISSUER, CLIENT_ID, REDIRECT_URI } from '../lib/config.js';
import { log } from '../lib/log.js';

const router = Router();

// Step ① from the architecture diagram: front-door of "the app". A real page
// load (not fetch) so the browser can ride the redirect chain through the OP.
//
// The mobile app hits this same route with ?client=mobile&redirect_uri=
// <its own, runtime-computed redirect> — everything else about this step is
// identical for web and mobile; only /callback's ending differs (see there).
router.get('/login', async (req, res) => {
  const client = req.query.client === 'mobile' ? 'mobile' : 'web';
  const mobileRedirectUri = client === 'mobile' ? req.query.redirect_uri : undefined;
  if (client === 'mobile' && !mobileRedirectUri) {
    return res.status(400).send('mobile login requires ?redirect_uri=');
  }

  const state = randomToken();
  const nonce = randomToken();
  const { code_verifier, code_challenge } = generatePkcePair();

  await pendingLogins.set(state, { code_verifier, nonce, client, mobileRedirectUri, createdAt: Date.now() });

  const url = new URL(`${OP_ISSUER}/authorize`);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email offline_access');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', code_challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  // Not a standard OIDC param — passed straight through from our own
  // /login caller to the OP's /authorize (see oidc-provider/app/authorize/route.js).
  if (req.query.isOpenCongrate === 'true') url.searchParams.set('isOpenCongrate', 'true');

  log('RP-backend', '-> OP GET /authorize', { state, client, redirect_uri: REDIRECT_URI, isOpenCongrate: req.query.isOpenCongrate === 'true' });
  res.redirect(url.toString());
});

export default router;
