/** @type {import('next').NextConfig} */
const nextConfig = {
  // .well-known is awkward as a literal App Router folder, so the real
  // handlers live at plain paths and get rewritten to the spec-required URLs.
  async rewrites() {
    return [
      { source: '/.well-known/openid-configuration', destination: '/openid-configuration' },
      { source: '/.well-known/jwks.json', destination: '/jwks.json' },
    ];
  },
};

module.exports = nextConfig;
