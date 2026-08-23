import { NextResponse } from 'next/server';
import { getKeys } from '../../lib/keys';

// Served at /.well-known/jwks.json via the rewrite in next.config.js.
export async function GET() {
  const { jwk } = await getKeys();
  return NextResponse.json({ keys: [jwk] });
}
