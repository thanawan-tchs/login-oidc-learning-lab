import { NextResponse } from 'next/server';
import { interactions } from '../../../../../lib/stores';
import { absoluteUrl } from '../../../../../lib/absoluteUrl';
import { log } from '../../../../../lib/log';

export async function POST(request, { params }) {
  const { uid } = params;
  const interaction = await interactions.get(uid);
  if (!interaction) return new NextResponse('interaction not found or already used', { status: 400 });
  if (!interaction.accountId) {
    return NextResponse.redirect(absoluteUrl(`/interaction/${uid}/login`), 303);
  }

  const form = await request.formData();
  if (!form.get('agree')) {
    return NextResponse.redirect(absoluteUrl(`/interaction/${uid}/terms?error=1`), 303);
  }

  interaction.termsAcceptedAt = Date.now();
  await interactions.set(uid, interaction);
  log('OP', `interaction ${uid}: terms accepted`);

  return NextResponse.redirect(absoluteUrl(`/interaction/${uid}/consent`), 303);
}
