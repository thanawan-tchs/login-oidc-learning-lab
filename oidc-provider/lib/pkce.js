import { createHash } from 'crypto';

export function verifyPkce(codeVerifier, codeChallenge, method) {
  if (!codeChallenge) return true; // client didn't use PKCE (not recommended, but not our call to force here)
  if (!codeVerifier) return false;
  if (method === 'plain') return codeVerifier === codeChallenge;
  const hash = createHash('sha256').update(codeVerifier).digest('base64url');
  return hash === codeChallenge;
}
