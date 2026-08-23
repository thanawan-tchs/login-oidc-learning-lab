import { interactions } from '../../../../lib/stores';

export default async function LoginPage({ params, searchParams }) {
  const interaction = await interactions.get(params.uid);

  if (!interaction) {
    return (
      <main className="page">
        <div className="card">
          <div className="eyebrow">Interaction expired</div>
          <h1>This sign-in link is no longer valid</h1>
          <p className="lede">
            The interaction was already finished, denied, or has expired.
            Go back to the app and click &ldquo;Log in&rdquo; again.
          </p>
        </div>
      </main>
    );
  }

  const invalid = searchParams?.error === 'invalid_phone';

  return (
    <main className="page">
      <div className="card">
        <div className="progress">
          <span className="done" /><span /><span /><span /><span />
        </div>
        <div className="eyebrow">Step 1 of 5 · Sign in</div>
        <h1>Enter your mobile number</h1>
        <p className="lede">
          <b>{interaction.params.client_id}</b> wants to sign you in and
          access: <code>{interaction.params.scope}</code>. We&rsquo;ll text you
          a one-time code.
        </p>

        {invalid && <div className="error-banner">Enter a valid mobile number, e.g. +15551234567.</div>}

        <form method="POST" action={`/api/interaction/${params.uid}/login`}>
          <label htmlFor="phone">Mobile number</label>
          <input id="phone" name="phone" type="text" defaultValue="+15551234567" autoComplete="tel" required />

          <button type="submit" className="primary">Send code</button>
        </form>

        <p className="hint">
          This is our own UI — Keycloak is only reached over its Admin API to
          look up or create your account by phone number, never for the login
          screen itself.
        </p>
      </div>
    </main>
  );
}
