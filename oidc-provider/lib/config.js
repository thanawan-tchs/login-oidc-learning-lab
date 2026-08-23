// Values that would come from env vars / client registration in a real
// deployment. Secrets are read from process.env (Next.js auto-loads
// .env/.env.local) — see .env.example.

export const ISSUER = process.env.OP_ISSUER || 'http://localhost:4000';

// The OP's own client registry — "who is allowed to ask the OP for tokens."
export const clients = {
  'demo-rp': {
    client_id: 'demo-rp',
    client_secret: process.env.DEMO_RP_CLIENT_SECRET || 'rp-secret-dev',
    redirect_uris: ['http://localhost:4001/callback'],
    post_logout_redirect_uris: ['http://localhost:5173/'],
  },
};
