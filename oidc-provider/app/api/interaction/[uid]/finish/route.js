import { NextResponse } from 'next/server';
import { interactions } from '../../../../../lib/stores';
import { finishInteraction } from '../../../../../lib/finishInteraction';
import { absoluteUrl } from '../../../../../lib/absoluteUrl';

// The pivotal step for the normal, human-driven path: congrats' "Continue"
// button lands here once terms + consent are both done. See
// lib/finishInteraction.js for what actually happens — the SSO auto-finish
// path in app/authorize/route.js reaches the exact same function directly.
export async function POST(request, { params }) {
  const { uid } = params;
  const interaction = await interactions.get(uid);
  if (!interaction) return new NextResponse('interaction not found or already used', { status: 400 });
  if (!interaction.consentGivenAt) {
    return NextResponse.redirect(absoluteUrl(`/interaction/${uid}/consent`), 303);
  }

  return finishInteraction(interaction);
}
