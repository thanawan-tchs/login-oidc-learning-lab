import { getRedis } from './redis';

// Redis-backed stores. Every value is JSON-serialized under a prefixed key
// with a TTL matching its real-world lifetime — Redis expiry does the
// cleanup work the old in-memory Maps needed no help with, and (unlike
// those Maps) these survive an `oidc-provider` restart.
//
// IMPORTANT semantic difference from the old Map-based store: `get()` now
// returns a *fresh deserialized copy*, not a live reference. Mutating the
// returned object no longer updates what's stored — callers that mutate an
// interaction/session must call `set()` again to persist the change. Every
// call site that does this was updated accordingly.
function makeStore(prefix, ttlSeconds) {
  return {
    async get(key) {
      const redis = await getRedis();
      const raw = await redis.get(prefix + key);
      return raw ? JSON.parse(raw) : undefined;
    },
    async set(key, value) {
      const redis = await getRedis();
      await redis.set(prefix + key, JSON.stringify(value), { EX: ttlSeconds });
    },
    async delete(key) {
      const redis = await getRedis();
      await redis.del(prefix + key);
    },
  };
}

// uid -> { params, status, accountId?, profile?, grantedScope?, ... }
// Deleted the moment `finish` succeeds — see api/interaction/[uid]/finish.
// TTL is a sliding 10 minutes: every step's `set()` renews it, so an
// abandoned interaction still cleans itself up.
export const interactions = makeStore('interaction:', 600);

// code -> { accountId, clientId, redirectUri, scope, nonce, codeChallenge, ... }
// Single-use, deleted the instant /token redeems it.
export const codes = makeStore('code:', 60);

// sid -> { accountId, createdAt } — the OP's own SSO session, independent of
// any RP's session and of any token's lifetime.
export const sessions = makeStore('session:', 60 * 60 * 12);

// opaque access_token -> { accountId, clientId, scope, profile, expiresAt }
export const accessTokens = makeStore('access_token:', 60 * 5);

// opaque refresh_token -> { accountId, clientId, scope, profile }
export const refreshTokens = makeStore('refresh_token:', 60 * 60 * 24 * 30);
