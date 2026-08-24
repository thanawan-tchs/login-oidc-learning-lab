import { ISSUER } from './config';

// Next.js's dev server does NOT reliably reflect the Host header a client
// actually connected with in `request.url` inside Route Handlers — it can
// fall back to its own bind address (localhost) regardless of whether the
// browser reached this server via a LAN IP or anything else. Every
// self-redirect in this app must be built from the configured ISSUER, never
// from `request.url`, or a client on a different host than "localhost"
// silently gets redirected back to a "localhost" address it can't reach.
export function absoluteUrl(path) {
  return new URL(path, ISSUER);
}
