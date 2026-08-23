import { SignJWT } from 'jose';
import { randomBytes } from 'crypto';
import { getKeys } from './keys';
import { accessTokens, refreshTokens } from './stores';
import { ISSUER } from './config';
import { log } from './log';

// Mints the id_token (always a JWT) and the access_token (deliberately an
// opaque random string here, not a JWT — the spec never requires access
// tokens to be JWTs, only id_tokens are). Optionally rotates a refresh_token
// when the offline_access scope was granted.
export async function issueTokens({ accountId, clientId, scope, nonce, profile }) {
  const { privateKey, jwk } = await getKeys();
  const now = Math.floor(Date.now() / 1000);
  const scopes = scope.split(' ').filter(Boolean);

  const claims = {
    iss: ISSUER,
    sub: accountId,
    aud: clientId,
    iat: now,
    exp: now + 5 * 60,
    auth_time: now,
    ...(nonce ? { nonce } : {}),
    ...(scopes.includes('profile') || scopes.includes('email') ? profile : {}),
  };

  const id_token = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
    .sign(privateKey);

  const access_token = randomBytes(24).toString('base64url');
  await accessTokens.set(access_token, {
    accountId,
    clientId,
    scope,
    profile,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  let refresh_token;
  if (scopes.includes('offline_access')) {
    refresh_token = randomBytes(24).toString('base64url');
    await refreshTokens.set(refresh_token, { accountId, clientId, scope, profile });
  }

  log('OP', 'issued tokens', {
    sub: accountId,
    aud: clientId,
    access_token: `${access_token.slice(0, 8)}…`,
    refresh_token: refresh_token ? `${refresh_token.slice(0, 8)}…` : undefined,
  });

  return {
    token_type: 'Bearer',
    id_token,
    access_token,
    expires_in: 300,
    scope,
    ...(refresh_token ? { refresh_token } : {}),
  };
}
