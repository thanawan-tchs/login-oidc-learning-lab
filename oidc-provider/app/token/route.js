import { NextResponse } from 'next/server';
import { codes, refreshTokens } from '../../lib/stores';
import { clients } from '../../lib/config';
import { verifyPkce } from '../../lib/pkce';
import { issueTokens } from '../../lib/tokens';
import { checkRateLimit, clientIp } from '../../lib/rateLimit';
import { log } from '../../lib/log';

function err(error, description, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status });
}

// The back-channel step. Whoever calls this (only the RP-backend, in this
// demo) authenticates itself with client_id + client_secret in the body —
// the browser is never involved in this request at all.
export async function POST(request) {
  if (!(await checkRateLimit(`token:${clientIp(request)}`, 30, 60))) {
    return err('slow_down', 'too many token requests from this client, try again shortly', 429);
  }

  const form = await request.formData();
  const grant_type = form.get('grant_type');
  const client_id = form.get('client_id');
  const client_secret = form.get('client_secret');

  log('OP', 'POST /token', { grant_type, client_id });

  const client = clients[client_id];
  if (!client || client.client_secret !== client_secret) {
    return err('invalid_client', 'unknown client_id or wrong client_secret', 401);
  }

  if (grant_type === 'authorization_code') {
    const code = form.get('code');
    const redirect_uri = form.get('redirect_uri');
    const code_verifier = form.get('code_verifier');

    const entry = await codes.get(code);
    if (!entry) return err('invalid_grant', 'code is unknown, expired, or already used');
    await codes.delete(code); // single-use, no matter what happens next

    if (entry.expiresAt < Date.now()) return err('invalid_grant', 'code expired');
    if (entry.clientId !== client_id) return err('invalid_grant', 'code was not issued to this client');
    if (entry.redirectUri !== redirect_uri) return err('invalid_grant', 'redirect_uri does not match the one used at /authorize');
    if (!verifyPkce(code_verifier, entry.codeChallenge, entry.codeChallengeMethod)) {
      return err('invalid_grant', 'PKCE verification failed — code_verifier does not match code_challenge');
    }

    const tokens = await issueTokens({
      accountId: entry.accountId,
      clientId: client_id,
      scope: entry.scope,
      nonce: entry.nonce,
      profile: entry.profile,
    });
    return NextResponse.json(tokens);
  }

  if (grant_type === 'refresh_token') {
    const refresh_token = form.get('refresh_token');
    const entry = await refreshTokens.get(refresh_token);
    if (!entry || entry.clientId !== client_id) return err('invalid_grant', 'refresh_token is unknown or belongs to another client');
    await refreshTokens.delete(refresh_token); // rotate on use

    const tokens = await issueTokens({
      accountId: entry.accountId,
      clientId: client_id,
      scope: entry.scope,
      profile: entry.profile,
    });
    return NextResponse.json(tokens);
  }

  return err('unsupported_grant_type', `"${grant_type}" is not supported`);
}
