import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { interactions } from '../../lib/stores';
import { clients } from '../../lib/config';
import { log } from '../../lib/log';

// The front door. A browser lands here (redirected by the RP) asking to
// authenticate a user. We never handle that ourselves inline — we stash the
// request as an "interaction" and hand the browser off to our own UI for it.
export async function GET(request) {
  const url = new URL(request.url);
  const p = url.searchParams;

  const client_id = p.get('client_id');
  const redirect_uri = p.get('redirect_uri');
  const response_type = p.get('response_type');
  const scope = p.get('scope') || 'openid';
  const state = p.get('state');
  const nonce = p.get('nonce');
  const code_challenge = p.get('code_challenge');
  const code_challenge_method = p.get('code_challenge_method') || 'S256';

  log('OP', 'GET /authorize', { client_id, redirect_uri, response_type, scope, state });

  const client = clients[client_id];
  if (!client || !client.redirect_uris.includes(redirect_uri)) {
    return new NextResponse('invalid_request: unknown client_id or redirect_uri', { status: 400 });
  }
  if (response_type !== 'code') {
    return new NextResponse('unsupported_response_type: only "code" is supported', { status: 400 });
  }
  if (!scope.split(' ').includes('openid')) {
    return new NextResponse('invalid_scope: "openid" scope is required', { status: 400 });
  }

  const uid = randomUUID();
  await interactions.set(uid, {
    uid,
    createdAt: Date.now(),
    params: { client_id, redirect_uri, scope, state, nonce, code_challenge, code_challenge_method },
    status: 'new',
  });

  log('OP', `interaction ${uid} created`, { client_id, scope });

  return NextResponse.redirect(new URL(`/interaction/${uid}/login`, request.url), 303);
}
