import { NextResponse } from 'next/server';
import { interactions } from '../../../../../lib/stores';
import { log } from '../../../../../lib/log';

export async function POST(request, { params }) {
  const { uid } = params;
  const interaction = await interactions.get(uid);
  if (!interaction) return new NextResponse('interaction not found or already used', { status: 400 });
  if (!interaction.accountId) {
    return NextResponse.redirect(new URL(`/interaction/${uid}/login`, request.url), 303);
  }

  const form = await request.formData();
  if (!form.get('agree')) {
    return NextResponse.redirect(new URL(`/interaction/${uid}/terms?error=1`, request.url), 303);
  }

  interaction.termsAcceptedAt = Date.now();
  await interactions.set(uid, interaction);
  log('OP', `interaction ${uid}: terms accepted`);

  return NextResponse.redirect(new URL(`/interaction/${uid}/consent`, request.url), 303);
}
