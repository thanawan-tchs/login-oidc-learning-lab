// Values that would come from env vars / secrets manager in a real
// deployment. Loaded via Node's native `--env-file=.env` (see package.json's
// `dev` script) — see .env.example. Fallback defaults match the checked-in
// dev-only values elsewhere in this repo.

export const PORT = process.env.PORT || 4001;

// LAN IP, not localhost — OP_ISSUER doubles as the target of browser-facing
// redirects (see routes/login.js), so it must be reachable by whatever's
// connecting: a web browser, the Android emulator, a physical device.
export const OP_ISSUER = process.env.OP_ISSUER || 'http://192.168.1.38:4000';

// This client is registered in oidc-provider/lib/config.js — the two files
// must agree.
export const CLIENT_ID = process.env.CLIENT_ID || 'demo-rp';
export const CLIENT_SECRET = process.env.CLIENT_SECRET || 'rp-secret-dev';
export const REDIRECT_URI = process.env.REDIRECT_URI || 'http://192.168.1.38:4001/callback';

export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
export const POST_LOGOUT_REDIRECT_URI = process.env.POST_LOGOUT_REDIRECT_URI || 'http://localhost:5173/';
