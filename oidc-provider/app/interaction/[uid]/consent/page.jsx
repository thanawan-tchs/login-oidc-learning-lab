import { interactions } from '../../../../lib/stores';

const SCOPE_COPY = {
  openid: { label: 'Confirm your identity', desc: 'Lets the app know it’s really you (issues an ID token).' },
  profile: { label: 'Your basic profile', desc: 'Name and username.' },
  email: { label: 'Your email address', desc: 'Email and whether it’s verified.' },
  offline_access: { label: 'Stay signed in', desc: 'Issues a refresh token so the app can renew access without you logging in again.' },
};

export default async function ConsentPage({ params }) {
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

  const scopes = interaction.params.scope.split(' ').filter((s) => SCOPE_COPY[s]);

  return (
    <main className="page">
      <div className="card">
        <div className="progress">
          <span className="done" /><span className="done" /><span className="done" /><span className="done" /><span />
        </div>
        <div className="eyebrow">Step 4 of 5 · Consent (mockup A)</div>
        <h1>{interaction.params.client_id} would like to:</h1>
        <p className="lede">
          Signed in as <b>{interaction.profile?.email || interaction.profile?.preferred_username}</b>
        </p>

        <ul className="scope-list">
          {scopes.map((s) => (
            <li key={s}>
              <span className="dot" />
              <span>
                <b>{SCOPE_COPY[s].label}</b>
                <span className="desc">{SCOPE_COPY[s].desc}</span>
              </span>
            </li>
          ))}
        </ul>

        <form method="POST" action={`/api/interaction/${params.uid}/consent`}>
          <div className="button-row">
            <button type="submit" name="decision" value="deny" className="secondary">Deny</button>
            <button type="submit" name="decision" value="allow" className="primary">Allow</button>
          </div>
        </form>

        <p className="hint">
          This is the OAuth scope-consent screen &mdash; separate from the
          Terms step you just saw. Denying redirects the app straight back
          with <code>error=access_denied</code>.
        </p>
      </div>
    </main>
  );
}
