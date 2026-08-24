import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { interactions } from '../../../../../lib/stores';
import { absoluteUrl } from '../../../../../lib/absoluteUrl';
import { log } from '../../../../../lib/log';

const PHONE_RE = /^\+?[1-9]\d{7,14}$/;
const OTP_TTL_MS = 5 * 60 * 1000;

export async function POST(request, { params }) {
  const { uid } = params;
  const interaction = await interactions.get(uid);
  if (!interaction) return new NextResponse('interaction not found or already used', { status: 400 });

  const form = await request.formData();
  const phone = (form.get('phone') || '').trim();

  if (!PHONE_RE.test(phone)) {
    return NextResponse.redirect(absoluteUrl(`/interaction/${uid}/login?error=invalid_phone`), 303);
  }

  const code = randomInt(100000, 1000000).toString();
  interaction.otp = { code, phone, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 };
  await interactions.set(uid, interaction);

  // Mocked delivery — a real deployment calls an SMS provider here instead.
  log('OP', `interaction ${uid}: OTP for ${phone} is ${code} (mock SMS — logged, not sent)`);

  return NextResponse.redirect(absoluteUrl(`/interaction/${uid}/verify-otp`), 303);
}
