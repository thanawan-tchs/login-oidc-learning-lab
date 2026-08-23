import { NextResponse } from 'next/server';
import { accessTokens } from '../../lib/stores';
import { checkRateLimit, clientIp } from '../../lib/rateLimit';
import { log } from '../../lib/log';

export async function GET(request) {
  if (!(await checkRateLimit(`userinfo:${clientIp(request)}`, 60, 60))) {
    return NextResponse.json({ error: 'slow_down' }, { status: 429 });
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const entry = token && (await accessTokens.get(token));

  log('OP', 'GET /userinfo', { hasBearer: Boolean(token) });

  if (!entry || entry.expiresAt < Date.now()) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const scopes = entry.scope.split(' ');
  const claims = { sub: entry.accountId };
  if (scopes.includes('profile') || scopes.includes('email')) Object.assign(claims, entry.profile);

  return NextResponse.json(claims);
}
