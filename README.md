# OIDC login demo — hand-rolled OP (mobile + OTP) + React/BFF

A three-service demo built to make the OIDC handshake fully observable:
every request/response, every hop, and which system produced it.

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
                                        OP checks the code, then finds or
                                        creates the account by phone number
                                        in its OWN Redis user store
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

There's only one "client" registration in this whole system now: `demo-rp`,
in the OP's own client table (`oidc-provider/lib/config.js`) — "who is
allowed to ask the OP for tokens." The OP is fully self-contained: it
authenticates users itself (mobile + OTP) and stores their accounts itself
(Redis) — there's no third identity service anymore. (An earlier iteration
of this project used Keycloak, first via ROPC, then via real OIDC
federation, then purely as a user directory over its Admin API — see git
history/prior conversation if you want to see what that looked like. Once
the OP became the actual authenticator *and* had nowhere left to delegate
identity storage to, Keycloak stopped earning its keep and was removed.)

## Run it

**1. Redis (Docker)**

```bash
cd docker
docker compose up -d
docker exec docker-redis-1 redis-cli ping   # sanity check
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
Watch both server terminals — every request in and out is logged with a
`[tag]` prefix (`[OP]`, `[RP-backend]`, `[RP-backend -> OP]`).

## Where each journey step lives

| Journey step | Where |
|---|---|
| Open login page | `frontend` Home → full-page nav to `rp-backend` `GET /login` |
| `create interaction/:uid` | `oidc-provider` `GET /authorize` → Redis `interaction:*` key |
| Enter mobile number (our UI) | `oidc-provider` `GET /interaction/:uid/login` |
| Send + verify OTP | `POST /api/interaction/:uid/login` generates it (mock "SMS", logged); `POST /api/interaction/:uid/verify-otp` checks it, then calls `findOrCreateUserByPhone` (`lib/users.js`, Redis) |
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
- **Identity**: `oidc-provider/lib/users.js` is the OP's own user directory —
  a Redis key per phone number (`user:<phone>`, no TTL, unlike everything
  else this project stores in Redis), holding a generated UUID that becomes
  the token `sub`. Looking up the same phone number twice returns the same
  account. Same shape (`{ accountId, profile }`) every login mechanism this
  project has used has produced, so nothing downstream ever had to change.

## Production hardening

What changed from the original learning-demo cut, and why:

- **Real credential verification, not ROPC.** The OP verifies the OTP
  itself rather than forwarding a password to a third party.
- **Redis-backed persistence.** Every store that used to be an in-memory
  `Map` (`oidc-provider/lib/stores.js`: interactions, codes, sessions,
  access/refresh tokens, now also `lib/users.js`'s accounts;
  `rp-backend/lib/sessionStore.js`: pending logins, sessions) is Redis, with
  per-record TTLs (except user accounts, which are permanent). Verified by
  restarting both Node services mid-session and confirming `/me` still
  resolves.
- **Secrets via env vars**, not literals. `oidc-provider/.env.local` and
  `rp-backend/.env` (both gitignored; `.env.example` files committed)
  supply `DEMO_RP_CLIENT_SECRET` and `CLIENT_SECRET`.
- **Rate limiting** on `POST /token`, `GET /userinfo`, and OTP resend
  (Redis fixed-window counter, `oidc-provider/lib/rateLimit.js`), plus a
  hard per-interaction cap on wrong-OTP attempts.
- **Token revocation** — `POST /revoke` (RFC 7009) on the OP, plus a
  `revocation_endpoint` in the discovery document.
- **Cookies** (`op_session`, `rp_session`) now set `secure` when
  `NODE_ENV=production`, alongside the existing `httpOnly`/`sameSite=lax`.

**What's still deployment-specific, not code:**

- **A real SMS provider.** OTP delivery is mocked (logged, not sent) — see
  "Login mechanics" above for exactly what to swap in.
- **TLS termination.** Everything here runs on plain HTTP on `localhost`.
  A real deployment puts a reverse proxy (Caddy, nginx, a cloud load
  balancer) in front of both Node services with real certificates — there's
  no meaningful way to demo that on localhost, and the `secure` cookie flag
  above is what actually depends on it being there.
- **A real secrets manager** (Vault, AWS/GCP Secrets Manager, etc.) in place
  of `.env` files, for anything beyond a single developer's machine.
- **A real user directory**, if you outgrow "one Redis key per phone
  number" — the point where you'd reach for something like Keycloak (or a
  proper database) again is when you need more than lookup-by-phone: admin
  tooling, audit trails, roles/groups, or federation with other identity
  providers.
