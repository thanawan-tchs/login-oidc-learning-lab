import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { interactions, codes, sessions } from './stores';
import { log } from './log';

// Mints a single-use code, stands up (or refreshes) the OP's own session,
// and destroys the interaction record. Shared by two callers: the normal
// congrats -> "Continue" POST, and /authorize's SSO auto-finish path —
// same ending either way, just reached with or without the human actually
// clicking through terms/consent first.
export async function finishInteraction(interaction) {
  const code = randomBytes(24).toString('base64url');
  await codes.set(code, {
    accountId: interaction.accountId,
    clientId: interaction.params.client_id,
    redirectUri: interaction.params.redirect_uri,
    scope: interaction.grantedScope,
    nonce: interaction.params.nonce,
    codeChallenge: interaction.params.code_challenge,
    codeChallengeMethod: interaction.params.code_challenge_method,
    profile: interaction.profile,
    expiresAt: Date.now() + 60 * 1000,
  });

  const sid = randomBytes(16).toString('base64url');
  await sessions.set(sid, { accountId: interaction.accountId, profile: interaction.profile, createdAt: Date.now() });

  await interactions.delete(interaction.uid);
  log('OP', `interaction ${interaction.uid}: finished -> code issued, OP session ${sid} created, interaction deleted`, {
    accountId: interaction.accountId,
  });

  const redirectUrl = new URL(interaction.params.redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (interaction.params.state) redirectUrl.searchParams.set('state', interaction.params.state);

  const res = NextResponse.redirect(redirectUrl, 303);
  res.cookies.set('op_session', sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}
