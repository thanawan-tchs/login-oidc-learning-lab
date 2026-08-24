import { NextResponse } from 'next/server';
import { interactions } from '../../../../../lib/stores';
import { absoluteUrl } from '../../../../../lib/absoluteUrl';
import { finishInteraction } from '../../../../../lib/finishInteraction';
import { log } from '../../../../../lib/log';

export async function POST(request, { params }) {
  const { uid } = params;
  const interaction = await interactions.get(uid);
  if (!interaction) return new NextResponse('interaction not found or already used', { status: 400 });
  if (!interaction.termsAcceptedAt) {
    return NextResponse.redirect(absoluteUrl(`/interaction/${uid}/terms`), 303);
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
  log('OP', `interaction ${uid}: consent granted`, { scope: interaction.grantedScope });

  // The congrats page only ever shows when the request explicitly asked for
  // it (?isOpenCongrate=true, set back in /authorize) — otherwise this goes
  // straight to the same finish logic congrats' "Continue" button uses.
  if (interaction.params.isOpenCongrate) {
    await interactions.set(uid, interaction);
    return NextResponse.redirect(absoluteUrl(`/interaction/${uid}/congrats`), 303);
  }

  return finishInteraction(interaction);
}
