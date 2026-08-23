import { randomBytes, createHash } from 'crypto';

export function generatePkcePair() {
  const code_verifier = randomBytes(32).toString('base64url');
  const code_challenge = createHash('sha256').update(code_verifier).digest('base64url');
  return { code_verifier, code_challenge };
}

export function randomToken(bytes = 24) {
  return randomBytes(bytes).toString('base64url');
}
