import { randomUUID } from 'crypto';
import { getRedis } from './redis';
import { log } from './log';

// The OP's own user directory — permanent records, no TTL, unlike every
// other key this project stores in Redis. Phone number is the only lookup
// key this project needs, so it's also the Redis key directly.
export async function findOrCreateUserByPhone(phone) {
  const redis = await getRedis();
  const key = `user:${phone}`;

  const existing = await redis.get(key);
  if (existing) {
    const user = JSON.parse(existing);
    log('OP', 'user store: found existing account', { accountId: user.id, phone });
    return toIdentity(user);
  }

  const user = { id: randomUUID(), phone, createdAt: Date.now() };
  await redis.set(key, JSON.stringify(user));
  log('OP', 'user store: created new account', { accountId: user.id, phone });
  return toIdentity(user);
}

function toIdentity(user) {
  return {
    accountId: user.id,
    profile: {
      phone_number: user.phone,
      phone_number_verified: true,
      preferred_username: user.phone,
    },
  };
}
