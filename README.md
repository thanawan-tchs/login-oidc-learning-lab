# OIDC login demo — hand-rolled OP + Keycloak + React/BFF

A four-service demo built to make the OIDC handshake fully observable: every
request/response, every hop, and which system produced it.

```
Browser ──① GET /login──────────────▶ RP-backend :4001  ("the app" — BFF)
Browser ◀─② 302 /authorize───────────  RP-backend
Browser ──③ GET /authorize───────────▶ OP :4000          ("the oidc")
                                        OP creates interaction/:uid (Redis)
Browser ◀─④ 302 /interaction/:uid/login  OP
Browser ──⑤ GET /interaction/:uid/login▶ OP  (OUR OWN page: mobile number)
Browser ──⑥ POST phone───────────────▶ OP
                                        OP generates a 6-digit OTP, logs it
                                        (mock "SMS"), stores it on the
                                        interaction
Browser ◀─⑦ 302 /interaction/:uid/verify-otp  OP
Browser ──⑧ GET verify-otp───────────▶ OP  (OUR OWN page: code input)
Browser ──⑨ POST code────────────────▶ OP
                                        OP checks the code, then calls
                                        Keycloak's ADMIN API :8081
                                        ("the identity service") to
                                        find-or-create the user by phone
Browser ◀─⑩ 302 /interaction/:uid/terms─  OP
Browser ──⑪ terms → consent → congrats, all under the SAME :uid──▶ OP
Browser ──⑫ "continue" on congrats───▶ OP  (interaction finish)
                                        OP mints code, creates OP session,
                                        DELETES the interaction record
Browser ◀─⑬ 302 redirect_uri?code&state  OP
Browser ──⑭ GET /callback?code───────▶ RP-backend
RP-backend ─⑮ POST /token────────────▶ OP   (server-to-server, code_verifier)
RP-backend ◀⑯ id_token+access_token───  OP
RP-backend sets its own session cookie, redirects browser to React /result
React ────⑰ GET /me (cookie)─────────▶ RP-backend  → renders decoded tokens
React ────⑱ Logout button────────────▶ RP-backend /logout → OP /logout
```

Two separate "clients" exist at two separate layers:

- **Keycloak client** `demo-op-admin` — confidential, service account only
  (`serviceAccountsEnabled: true`, no browser-facing flow at all). Keycloak
  never runs an OIDC login for end users in this setup — the OP verifies the
  OTP itself and only reaches Keycloak over its **Admin REST API**, as a
  service account with `manage-users`/`view-users` roles, to find-or-create
  the account by phone number.
- **OP client** `demo-rp` — registered in the OP's own client table
  (`oidc-provider/lib/config.js`). Only the RP-backend talks to it.

## Run it

**1. Identity service + Redis (Docker)**

```bash
cd docker
docker compose up -d
```

Brings up Keycloak at `http://localhost:8081` (realm `demo` imported: the
`demo-op-admin` service-account client — no seeded end-user, accounts are
created on demand by phone number) and Redis at `localhost:6379`. Sanity
check:

```bash
curl http://localhost:8081/realms/demo/.well-known/openid-configuration
docker exec docker-redis-1 redis-cli ping
```

**2. OIDC provider ("the oidc")**

```bash
cd oidc-provider
npm install
cp .env.example .env.local   # already present with working dev defaults
npm run dev     # http://localhost:4000
```

**3. RP backend ("the app", BFF)**

```bash
cd rp-backend
npm install
cp .env.example .env         # already present with working dev defaults
npm run dev     # http://localhost:4001
```

**4. Frontend ("the app", UI)**

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

Open `http://localhost:5173`, click **Log in**, enter any phone number like
`+15551234567`, then read the OTP off the `oidc-provider` terminal (or the
dev banner shown right on the page — gated off when `NODE_ENV=production`).
Watch all three terminals — every request in and out is logged with a
`[tag]` prefix (`[OP]`, `[OP -> Keycloak]`, `[RP-backend]`,
`[RP-backend -> OP]`).

## Where each journey step lives

| Journey step | Where |
|---|---|
| Open login page | `frontend` Home → full-page nav to `rp-backend` `GET /login` |
| `create interaction/:uid` | `oidc-provider` `GET /authorize` → Redis `interaction:*` key |
| Enter mobile number (our UI) | `oidc-provider` `GET /interaction/:uid/login` |
| Send + verify OTP | `POST /api/interaction/:uid/login` generates it (mock "SMS", logged); `POST /api/interaction/:uid/verify-otp` checks it, then calls `findOrCreateUserByPhone` (Keycloak Admin API) |
| Term consent | `oidc-provider` `/interaction/:uid/terms` |
| Consent mockup A (scopes) | `oidc-provider` `/interaction/:uid/consent` |
| Congrats page | `oidc-provider` `/interaction/:uid/congrats` |
| Got auth code | `POST /api/interaction/:uid/finish` mints the code, opens the **OP session**, deletes the interaction |
| Exchange code → token | `rp-backend` `GET /callback` → `POST` to OP `/token` (PKCE `code_verifier` checked, rate-limited) |
| Get session | `rp-backend` sets its own `rp_session` cookie (separate from the OP's session), stored in Redis |
| Display token as final page | `frontend` `/result` reads `GET /me` on `rp-backend` |
| Logout button | `frontend` → `rp-backend` `POST /logout` (clears RP session) → browser navigates to OP `/logout` (clears OP session) |

## Login mechanics (mobile + OTP)

- **Code**: 6 digits (`crypto.randomInt`), 5-minute expiry, max 5 wrong
  attempts before the interaction forces a resend — all tracked directly on
  the interaction record in Redis (`interaction.otp`), no separate store.
- **Delivery is mocked.** There's no SMS provider wired up — the code is
  logged (`[OP] ... OTP for +1555… is 123456 (mock SMS — logged, not sent)`)
  and shown in a dev banner on the verify page. A real deployment replaces
  that one `log(...)` call in `app/api/interaction/[uid]/login/route.js`
  with a call to a real provider (Twilio, SNS, etc.) and removes the dev
  banner entirely rather than just gating it.
- **Resend** is rate-limited to one per 30 seconds
  (`oidc-provider/lib/rateLimit.js`, reused from the `/token` limiter).
- **Identity**: the phone number *is* the Keycloak username — no custom user
  attribute needed, which sidesteps Keycloak's declarative User Profile
  restrictions on arbitrary attributes. `lib/keycloakAdmin.js` looks the user
  up by exact username match, creates one if none exists, and returns its
  Keycloak `id` as `sub` — the same shape every login mechanism this project
  has used has produced, so nothing downstream changed.

## Production hardening

What changed from the original learning-demo cut, and why:

- **Real credential verification, not ROPC — and Keycloak never runs an
  OIDC login at all anymore.** The OP verifies the OTP itself and reaches
  Keycloak only over its Admin API as a service account. This is a
  deliberate step *away* from federating to Keycloak's own hosted login
  (an earlier iteration of this hardening pass) because the login UI needed
  to be fully custom (mobile + OTP) rather than anything Keycloak can render
  itself.
- **Keycloak's own brute-force protection** (`bruteForceProtected: true` in
  the realm) still protects its admin console; the OTP endpoints have their
  own attempt/resend limits (above), since Keycloak isn't in a position to
  protect a credential step it never sees.
- **Redis-backed persistence.** Every store that used to be an in-memory
  `Map` (`oidc-provider/lib/stores.js`: interactions, codes, sessions,
  access/refresh tokens; `rp-backend/lib/sessionStore.js`: pending logins,
  sessions) is now Redis with per-record TTLs. Verified by restarting both
  Node services mid-session and confirming `/me` still resolves.
- **Secrets via env vars**, not literals. `oidc-provider/.env.local` and
  `rp-backend/.env` (both gitignored; `.env.example` files committed)
  supply `KEYCLOAK_ADMIN_CLIENT_SECRET`, `DEMO_RP_CLIENT_SECRET`,
  `CLIENT_SECRET`. The one exception: `docker/keycloak/realm-export.json`'s
  client secret is still a literal — Keycloak's plain-JSON realm import
  doesn't do `${env.*}` substitution (only its separate Vault SPI does,
  disproportionate effort for a local bootstrap file). A real deployment
  wouldn't bootstrap Keycloak from a committed JSON file at all — it'd
  provision the realm via the Admin API/Terraform with secrets from a real
  secrets manager.
- **Rate limiting** on `POST /token`, `GET /userinfo`, and OTP
  send/resend/verify (Redis fixed-window counter,
  `oidc-provider/lib/rateLimit.js`).
- **Token revocation** — `POST /revoke` (RFC 7009) on the OP, plus a
  `revocation_endpoint` in the discovery document.
- **Cookies** (`op_session`, `rp_session`) now set `secure` when
  `NODE_ENV=production`, alongside the existing `httpOnly`/`sameSite=lax`.

**What's still deployment-specific, not code:**

- **A real SMS provider.** OTP delivery is mocked (logged, not sent) — see
  "Login mechanics" above for exactly what to swap in.
- **TLS termination.** Everything here runs on plain HTTP on `localhost`.
  A real deployment puts a reverse proxy (Caddy, nginx, a cloud load
  balancer) in front of all three Node services with real certificates —
  there's no meaningful way to demo that on localhost, and the `secure`
  cookie flag above is what actually depends on it being there.
- **A real secrets manager** (Vault, AWS/GCP Secrets Manager, etc.) in place
  of `.env` files, for anything beyond a single developer's machine.
