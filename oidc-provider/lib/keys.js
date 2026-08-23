import { generateKeyPair, exportJWK } from 'jose';

// One RSA keypair for the life of the process, pinned to globalThis for the
// same HMR reason as stores.js. The public half is what /.well-known/jwks.json
// serves — anyone verifying our id_tokens (the RP backend) fetches it from there.
export function getKeys() {
  if (!globalThis.__oidcKeys) {
    globalThis.__oidcKeys = (async () => {
      const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
      const jwk = await exportJWK(publicKey);
      jwk.use = 'sig';
      jwk.alg = 'RS256';
      jwk.kid = 'demo-op-key-1';
      return { publicKey, privateKey, jwk };
    })();
  }
  return globalThis.__oidcKeys;
}
