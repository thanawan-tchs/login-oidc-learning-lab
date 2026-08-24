// Web clients carry the session in the rp_session cookie; the mobile app
// carries it as a bearer token (see routes/mobileSession.js) since a native
// HTTP client doesn't share a browser's cookie jar. Both are the same sid,
// just delivered differently — every route that needs "whose session is
// this" reads it through here rather than picking one transport itself.
export function getSessionId(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return req.cookies.rp_session;
}
