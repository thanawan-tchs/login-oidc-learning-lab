import { getRedis } from './redis';

// Fixed-window counter: INCR the window's key, set its expiry on first hit.
// Good enough to blunt brute-force/enumeration against /token, /userinfo,
// and the OTP endpoints — this isn't trying to be a general-purpose limiter.
export async function checkRateLimit(key, limit, windowSeconds) {
  const redis = await getRedis();
  const bucket = `ratelimit:${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const count = await redis.incr(bucket);
  if (count === 1) await redis.expire(bucket, windowSeconds);
  return count <= limit;
}

export function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}
