import { NextResponse } from 'next/server';
import { sessions } from '../../lib/stores';
import { absoluteUrl } from '../../lib/absoluteUrl';
import { log } from '../../lib/log';

// end_session_endpoint. Kills the OP's own SSO session — separate from, and
// unaffected by, whatever the RP does to its own session cookie.
export async function GET(request) {
  const url = new URL(request.url);
  const idTokenHint = url.searchParams.get('id_token_hint');
  const postLogoutRedirectUri = url.searchParams.get('post_logout_redirect_uri');

  const sid = request.cookies.get('op_session')?.value;
  if (sid) {
    await sessions.delete(sid);
    log('OP', `GET /logout: cleared OP session ${sid}`, { hadIdTokenHint: Boolean(idTokenHint) });
  } else {
    log('OP', 'GET /logout: no OP session cookie present');
  }

  const res = NextResponse.redirect(postLogoutRedirectUri || absoluteUrl('/'), 303);
  res.cookies.delete('op_session');
  return res;
}
