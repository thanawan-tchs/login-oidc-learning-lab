import { interactions } from '../../../../lib/stores';

export default async function CongratsPage({ params }) {
  const interaction = await interactions.get(params.uid);

  if (!interaction) {
    return (
      <main className="page">
        <div className="card">
          <div className="eyebrow">Interaction expired</div>
          <h1>This sign-in link is no longer valid</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="card">
        <div className="progress">
          <span className="done" /><span className="done" /><span className="done" /><span className="done" /><span className="done" />
        </div>
        <div className="eyebrow">Step 5 of 5 · Done</div>
        <div className="congrats-icon">✓</div>
        <h1>You&rsquo;re all set</h1>
        <p className="lede">
          Signed in as <b>{interaction.profile?.preferred_username}</b> and
          granted <b>{interaction.params.client_id}</b> access to{' '}
          <code>{interaction.grantedScope}</code>. Continuing will finish this
          interaction: it mints an authorization code, opens your OP session,
          and this interaction (<code>{params.uid.slice(0, 8)}&hellip;</code>)
          is deleted.
        </p>

        <form method="POST" action={`/api/interaction/${params.uid}/finish`}>
          <button type="submit" className="primary">Continue to {interaction.params.client_id}</button>
        </form>
      </div>
    </main>
  );
}
