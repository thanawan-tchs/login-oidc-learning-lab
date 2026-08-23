import { RP_BACKEND } from '../config.js';

export default function Home() {
  return (
    <main className="page">
      <div className="card">
        <div className="badge">demo app</div>
        <h1>OIDC login demo</h1>
        <p className="lede">
          This React app has no idea how to authenticate anyone &mdash; it
          just sends the browser to its own backend&rsquo;s{' '}
          <code>/login</code>, which redirects to our OIDC provider, which
          redirects to a login/terms/consent flow, which eventually redirects
          back with a session. Open your browser&rsquo;s network tab (and the
          three terminal windows) before clicking, to watch every hop.
        </p>
        <button className="primary" onClick={() => { window.location.href = `${RP_BACKEND}/login`; }}>
          Log in
        </button>
      </div>
    </main>
  );
}
