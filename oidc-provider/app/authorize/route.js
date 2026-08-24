import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { interactions, sessions } from '../../lib/stores';
import { clients } from '../../lib/config';
import { absoluteUrl } from '../../lib/absoluteUrl';
import { finishInteraction } from '../../lib/finishInteraction';
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
  const prompt = p.get('prompt');
  // Not a standard OIDC param — a demo-only flag so this project can show
  // (or skip) the congrats page on demand. Read once here, carried on
  // interaction.params so both the SSO path (below) and the normal
  // consent -> congrats path (consent/route.js) agree on it.
  const isOpenCongrate = p.get('isOpenCongrate') === 'true';

  log('OP', 'GET /authorize', { client_id, redirect_uri, response_type, scope, state, prompt, isOpenCongrate });

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
  const interaction = {
    uid,
    createdAt: Date.now(),
    params: { client_id, redirect_uri, scope, state, nonce, code_challenge, code_challenge_method, isOpenCongrate },
    status: 'new',
  };

  // SSO: if the browser already carries a valid OP session cookie and the
  // caller isn't forcing re-authentication (prompt=login, matching the real
  // OIDC `prompt` parameter), skip the credential step AND auto-accept
  // terms/consent — this account already went through them once, and this
  // is the OP's own client asking again, not a new one.
  const existingSid = request.cookies.get('op_session')?.value;
  const existingSession = prompt !== 'login' && existingSid ? await sessions.get(existingSid) : null;

  if (existingSession) {
    const now = Date.now();
    interaction.accountId = existingSession.accountId;
    interaction.profile = existingSession.profile;
    interaction.authenticatedAt = now;
    interaction.termsAcceptedAt = now;
    interaction.grantedScope = scope;
    interaction.consentGivenAt = now;
    interaction.ssoSessionId = existingSid;

    if (isOpenCongrate) {
      // Everything up to congrats is skipped (already authenticated,
      // already consented) — but congrats itself is shown because the
      // caller explicitly asked for it.
      await interactions.set(uid, interaction);
      log('OP', `interaction ${uid}: reusing OP session ${existingSid} (SSO) — showing congrats before finishing`, {
        accountId: existingSession.accountId,
      });
      return NextResponse.redirect(absoluteUrl(`/interaction/${uid}/congrats`), 303);
    }

    log('OP', `interaction ${uid}: reusing OP session ${existingSid} (SSO) — auto-finishing straight to token`, {
      accountId: existingSession.accountId,
    });
    return finishInteraction(interaction);
  }

  await interactions.set(uid, interaction);
  log('OP', `interaction ${uid} created`, { client_id, scope, isOpenCongrate });

  return NextResponse.redirect(absoluteUrl(`/interaction/${uid}/login`), 303);
}
