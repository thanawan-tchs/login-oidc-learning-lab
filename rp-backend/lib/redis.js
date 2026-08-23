import { createClient } from 'redis';

let clientPromise;

// One connection for the process lifetime — no HMR here (this isn't Next.js),
// so a plain module-level singleton is enough.
export function getRedis() {
  if (!clientPromise) {
    const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', (err) => console.error('[RP-backend redis] connection error', err));
    clientPromise = client.connect().then(() => client);
  }
  return clientPromise;
}
