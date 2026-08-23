import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { interactions } from '../../../../../lib/stores';
import { checkRateLimit } from '../../../../../lib/rateLimit';
import { log } from '../../../../../lib/log';

const OTP_TTL_MS = 5 * 60 * 1000;

export async function POST(request, { params }) {
  const { uid } = params;
  const interaction = await interactions.get(uid);
  if (!interaction || !interaction.otp) return new NextResponse('interaction not found or already used', { status: 400 });

  if (!(await checkRateLimit(`otp-resend:${uid}`, 1, 30))) {
    return NextResponse.redirect(new URL(`/interaction/${uid}/verify-otp?error=rate_limited`, request.url), 303);
  }

  const phone = interaction.otp.phone;
  const code = randomInt(100000, 1000000).toString();
  interaction.otp = { code, phone, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 };
  await interactions.set(uid, interaction);

  log('OP', `interaction ${uid}: resent OTP for ${phone} is ${code} (mock SMS — logged, not sent)`);

  return NextResponse.redirect(new URL(`/interaction/${uid}/verify-otp`, request.url), 303);
}
