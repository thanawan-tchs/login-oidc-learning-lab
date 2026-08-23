import { interactions } from '../../../../lib/stores';

export default async function TermsPage({ params, searchParams }) {
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

  const missing = searchParams?.error === '1';

  return (
    <main className="page">
      <div className="card">
        <div className="progress">
          <span className="done" /><span className="done" /><span className="done" /><span /><span />
        </div>
        <div className="eyebrow">Step 3 of 5 · Terms</div>
        <h1>Terms of service</h1>
        <p className="lede">
          Signed in as <b>{interaction.profile?.preferred_username}</b>. Please
          review and accept the terms below to continue.
        </p>

        {missing && <div className="error-banner">You need to accept the terms to continue.</div>}

        <div className="terms-box">
          This is a local learning demo. By continuing you agree that this
          screen exists purely to show where a &ldquo;terms&rdquo; interaction
          step lives in the flow, separate from the OAuth scope-consent screen
          that comes next. No data leaves your machine &mdash; every token
          issued here is minted by the demo OIDC provider running on your own
          computer, backed by its own Redis-based user store.
        </div>

        <form method="POST" action={`/api/interaction/${params.uid}/terms`}>
          <label className="checkbox-row">
            <input type="checkbox" name="agree" value="yes" />
            I have read and agree to the Terms of Service
          </label>
          <button type="submit" className="primary">Continue</button>
        </form>
      </div>
    </main>
  );
}
