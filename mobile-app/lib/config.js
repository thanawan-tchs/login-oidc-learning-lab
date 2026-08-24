// Your dev machine's LAN IP — not localhost, and not 10.0.2.2. The Android
// emulator's 10.0.2.2 alias only gets you to rp-backend; the OP's own
// redirects (oidc-provider) are browser-facing too and use this exact same
// IP (see oidc-provider/lib/config.js, rp-backend/lib/config.js), so one
// consistent LAN address makes both hops work, on the emulator or a real
// device. Update this if your machine's LAN IP changes.
export const RP_BACKEND_URL = 'http://192.168.1.38:4001';
