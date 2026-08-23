import { interactions } from '../../../../lib/stores';

export default async function VerifyOtpPage({ params, searchParams }) {
  const interaction = await interactions.get(params.uid);

  if (!interaction || !interaction.otp) {
    return (
      <main className="page">
        <div className="card">
          <div className="eyebrow">Interaction expired</div>
          <h1>This sign-in link is no longer valid</h1>
          <p className="lede">Go back to the app and click &ldquo;Log in&rdquo; again.</p>
        </div>
      </main>
    );
  }

  const error = searchParams?.error;
  const errorCopy = {
    wrong_code: 'That code is incorrect. Try again.',
    expired: 'That code expired. Send a new one.',
    too_many_attempts: 'Too many wrong attempts. Send a new code.',
    rate_limited: 'Wait a bit before requesting another code.',
  }[error];

  return (
    <main className="page">
      <div className="card">
        <div className="progress">
          <span className="done" /><span className="done" /><span /><span /><span />
        </div>
        <div className="eyebrow">Step 2 of 5 · Verify</div>
        <h1>Enter the code we sent</h1>
        <p className="lede">
          Sent to <b>{interaction.otp.phone}</b>.
        </p>

        {process.env.NODE_ENV !== 'production' && (
          <div className="dev-banner">
            Dev mode — no SMS provider is wired up, so here&rsquo;s the code
            we &ldquo;sent&rdquo; (also printed in the oidc-provider terminal): <b>{interaction.otp.code}</b>
          </div>
        )}

        {errorCopy && <div className="error-banner">{errorCopy}</div>}

        <form method="POST" action={`/api/interaction/${params.uid}/verify-otp`}>
          <label htmlFor="code">One-time code</label>
          <input
            id="code"
            name="code"
            type="text"
            className="otp-input"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
          />
          <button type="submit" className="primary">Verify</button>
        </form>

        <div className="resend-row">
          Didn&rsquo;t get it?
          <form method="POST" action={`/api/interaction/${params.uid}/resend-otp`} style={{ display: 'inline', marginLeft: 6 }}>
            <button type="submit">Resend code</button>
          </form>
        </div>
      </div>
    </main>
  );
}
