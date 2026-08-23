import { NextResponse } from 'next/server';
import { accessTokens, refreshTokens } from '../../lib/stores';
import { clients } from '../../lib/config';
import { log } from '../../lib/log';

// RFC 7009 token revocation. Same client authentication as /token. Per spec,
// an unknown token is not an error — the client just doesn't get to know
// whether it existed.
export async function POST(request) {
  const form = await request.formData();
  const token = form.get('token');
  const client_id = form.get('client_id');
  const client_secret = form.get('client_secret');

  const client = clients[client_id];
  if (!client || client.client_secret !== client_secret) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 });
  }
  if (!token) return new NextResponse(null, { status: 200 });

  const [access, refresh] = await Promise.all([accessTokens.get(token), refreshTokens.get(token)]);
  if (access) {
    await accessTokens.delete(token);
    log('OP', 'POST /revoke: access_token revoked', { clientId: client_id });
  } else if (refresh) {
    await refreshTokens.delete(token);
    log('OP', 'POST /revoke: refresh_token revoked', { clientId: client_id });
  } else {
    log('OP', 'POST /revoke: token not found (not an error per RFC 7009)', { clientId: client_id });
  }

  return new NextResponse(null, { status: 200 });
}
