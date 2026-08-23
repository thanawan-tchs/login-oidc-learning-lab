import { NextResponse } from 'next/server';
import { interactions } from '../../../../../lib/stores';
import { findOrCreateUserByPhone } from '../../../../../lib/keycloakAdmin';
import { log } from '../../../../../lib/log';

const MAX_ATTEMPTS = 5;

export async function POST(request, { params }) {
  const { uid } = params;
  const interaction = await interactions.get(uid);
  if (!interaction || !interaction.otp) return new NextResponse('interaction not found or already used', { status: 400 });

  const form = await request.formData();
  const submitted = (form.get('code') || '').trim();

  const { otp } = interaction;

  if (otp.expiresAt < Date.now()) {
    delete interaction.otp;
    await interactions.set(uid, interaction);
    return NextResponse.redirect(new URL(`/interaction/${uid}/verify-otp?error=expired`, request.url), 303);
  }

  if (submitted !== otp.code) {
    otp.attempts += 1;
    log('OP', `interaction ${uid}: wrong OTP attempt`, { attempts: otp.attempts });
    if (otp.attempts >= MAX_ATTEMPTS) {
      delete interaction.otp;
      await interactions.set(uid, interaction);
      return NextResponse.redirect(new URL(`/interaction/${uid}/verify-otp?error=too_many_attempts`, request.url), 303);
    }
    await interactions.set(uid, interaction);
    return NextResponse.redirect(new URL(`/interaction/${uid}/verify-otp?error=wrong_code`, request.url), 303);
  }

  const identity = await findOrCreateUserByPhone(otp.phone);

  interaction.accountId = identity.accountId;
  interaction.profile = identity.profile;
  interaction.authenticatedAt = Date.now();
  delete interaction.otp;
  await interactions.set(uid, interaction);

  log('OP', `interaction ${uid}: authenticated via OTP`, { accountId: identity.accountId, phone: identity.profile.phone_number });

  return NextResponse.redirect(new URL(`/interaction/${uid}/terms`, request.url), 303);
}
