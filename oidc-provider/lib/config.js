// Values that would come from env vars / client registration in a real
// deployment. Secrets are read from process.env (Next.js auto-loads
// .env/.env.local) — see .env.example.

// LAN IP, not localhost — this is a browser-facing address (every OP page
// and every redirect Location header is built from it), so it must be
// reachable by whatever's connecting: a web browser, the Android emulator,
// a physical device on the same Wi-Fi. Update if your machine's LAN IP changes.
export const ISSUER = process.env.OP_ISSUER || 'http://192.168.1.38:4000';

// The OP's own client registry — "who is allowed to ask the OP for tokens."
// redirect_uris must match EXACTLY what the client sends — that's a
// security control, not a formatting nicety, so this can't be dynamic.
export const clients = {
  'demo-rp': {
    client_id: 'demo-rp',
    client_secret: process.env.DEMO_RP_CLIENT_SECRET || 'rp-secret-dev',
    redirect_uris: ['http://192.168.1.38:4001/callback'],
    post_logout_redirect_uris: ['http://localhost:5173/'],
  },
};
