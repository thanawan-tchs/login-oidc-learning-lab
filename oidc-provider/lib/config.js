// Values that would come from env vars / client registration in a real
// deployment. Secrets are read from process.env (Next.js auto-loads
// .env/.env.local) — see .env.example. The fallback defaults match the
// checked-in dev-only values in docker/keycloak/realm-export.json and this
// repo's other .env.example files, so the demo still runs with zero setup;
// change them (and the matching values elsewhere) for anything beyond
// localhost.

export const ISSUER = process.env.OP_ISSUER || 'http://localhost:4000';

export const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || 'http://localhost:8081';
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'demo';
// Service-account client for the Admin API — Keycloak never runs an OIDC
// login for end users in this setup (see lib/keycloakAdmin.js); this is the
// only credential the OP holds for talking to Keycloak at all.
export const KEYCLOAK_ADMIN_CLIENT_ID = process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'demo-op-admin';
export const KEYCLOAK_ADMIN_CLIENT_SECRET = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || 'op-admin-secret-dev';

// The OP's own client registry. Separate from, and unrelated to, the
// Keycloak client above — this is "who is allowed to ask the OP for tokens",
// the Keycloak client is "how the OP itself proves who it is to Keycloak".
export const clients = {
  'demo-rp': {
    client_id: 'demo-rp',
    client_secret: process.env.DEMO_RP_CLIENT_SECRET || 'rp-secret-dev',
    redirect_uris: ['http://localhost:4001/callback'],
    post_logout_redirect_uris: ['http://localhost:5173/'],
  },
};
