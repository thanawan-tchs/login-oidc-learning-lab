import { NextResponse } from 'next/server';
import { interactions } from '../../../../../lib/stores';
import { log } from '../../../../../lib/log';

export async function POST(request, { params }) {
  const { uid } = params;
  const interaction = await interactions.get(uid);
  if (!interaction) return new NextResponse('interaction not found or already used', { status: 400 });
  if (!interaction.termsAcceptedAt) {
    return NextResponse.redirect(new URL(`/interaction/${uid}/terms`, request.url), 303);
  }

  const form = await request.formData();
  const decision = form.get('decision');

  if (decision !== 'allow') {
    log('OP', `interaction ${uid}: consent denied by user`);
    await interactions.delete(uid);
    const denyUrl = new URL(interaction.params.redirect_uri);
    denyUrl.searchParams.set('error', 'access_denied');
    denyUrl.searchParams.set('error_description', 'the user denied the consent request');
    if (interaction.params.state) denyUrl.searchParams.set('state', interaction.params.state);
    return NextResponse.redirect(denyUrl, 303);
  }

  interaction.grantedScope = interaction.params.scope;
  interaction.consentGivenAt = Date.now();
  await interactions.set(uid, interaction);
  log('OP', `interaction ${uid}: consent granted`, { scope: interaction.grantedScope });

  return NextResponse.redirect(new URL(`/interaction/${uid}/congrats`, request.url), 303);
}
