import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { RP_BACKEND_URL } from './config';
import { setToken } from './session';

// Opens the same login/OTP/terms/consent/congrats pages the web frontend
// uses, in an in-app browser, then trades the resulting handoff code for a
// bearer session token. Shared by the initial Home screen login AND both of
// the Result screen's "Reopen auth page" buttons — same journey either way.
// Returns the session payload on success, or null if the user
// cancelled/dismissed the browser (not an error).
//
// isOpenCongrate: when true, the congrats page is shown before finishing —
// otherwise (default) it's skipped straight through, same as a plain login.
export async function runLoginFlow({ isOpenCongrate = false } = {}) {
  // Different value in Expo Go (a proxied exp:// / auth.expo.io URL) than
  // in a standalone/dev-client build (the real otpdemo:// scheme from
  // app.json) — rp-backend can't hardcode this, so it's computed here and
  // passed along at the start of the flow.
  const redirectUri = AuthSession.makeRedirectUri();
  let loginUrl = `${RP_BACKEND_URL}/login?client=mobile&redirect_uri=${encodeURIComponent(redirectUri)}`;
  if (isOpenCongrate) loginUrl += '&isOpenCongrate=true';

  const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);
  if (result.type !== 'success') return null;

  const queryString = result.url.split('?')[1] || '';
  const handoff = new URLSearchParams(queryString).get('handoff');
  if (!handoff) throw new Error('No handoff code in the redirect.');

  const sessionRes = await fetch(`${RP_BACKEND_URL}/mobile/session?handoff=${encodeURIComponent(handoff)}`);
  if (!sessionRes.ok) throw new Error('Failed to exchange the handoff code for a session.');
  const session = await sessionRes.json();

  await setToken(session.sessionToken);
  return session;
}
