import { getRedis } from './redis.js';

function makeStore(prefix, ttlSeconds) {
  return {
    async get(key) {
      const redis = await getRedis();
      const raw = await redis.get(prefix + key);
      return raw ? JSON.parse(raw) : undefined;
    },
    async set(key, value, ttlOverrideSeconds) {
      const redis = await getRedis();
      await redis.set(prefix + key, JSON.stringify(value), { EX: ttlOverrideSeconds || ttlSeconds });
    },
    async delete(key) {
      const redis = await getRedis();
      await redis.del(prefix + key);
    },
  };
}

// state -> { code_verifier, nonce, createdAt } — lives only between
// GET /login and GET /callback for a single browser round trip.
export const pendingLogins = makeStore('pending_login:', 60 * 5);

// sid (our own cookie value) -> { claims, accessToken, refreshToken, idToken,
// expiresAt, createdAt } — the RP's own session, independent of the OP's.
// TTL is set per-call to match the token's actual expires_in (see callback.js).
export const sessions = makeStore('session:', 60 * 60 * 12);
