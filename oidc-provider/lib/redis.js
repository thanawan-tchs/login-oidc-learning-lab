import { createClient } from 'redis';

// One connection for the life of the process, pinned to globalThis for the
// same HMR-survival reason as keys.js — Next.js re-evaluates modules on
// every dev-mode edit, but we want one real Redis connection underneath.
export function getRedis() {
  if (!globalThis.__oidcRedis) {
    const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', (err) => console.error('[OP redis] connection error', err));
    globalThis.__oidcRedis = client.connect().then(() => client);
  }
  return globalThis.__oidcRedis;
}
