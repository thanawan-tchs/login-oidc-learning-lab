import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { interactions, codes, sessions } from '../../../../../lib/stores';
import { log } from '../../../../../lib/log';

// The pivotal step: mint a single-use code, stand up the OP's own session,
// and destroy the interaction record — everything that happened under this
// :uid (login, terms, consent) collapses into a session the moment this runs.
export async function POST(request, { params }) {
  const { uid } = params;
  const interaction = await interactions.get(uid);
  if (!interaction) return new NextResponse('interaction not found or already used', { status: 400 });
  if (!interaction.consentGivenAt) {
    return NextResponse.redirect(new URL(`/interaction/${uid}/consent`, request.url), 303);
  }

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
  await sessions.set(sid, { accountId: interaction.accountId, createdAt: Date.now() });

  await interactions.delete(uid);
  log('OP', `interaction ${uid}: finished -> code issued, OP session ${sid} created, interaction deleted`, {
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
