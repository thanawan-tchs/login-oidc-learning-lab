import { useEffect, useState } from 'react';
import { RP_BACKEND } from '../config.js';

const CLAIM_ORDER = ['sub', 'iss', 'aud', 'iat', 'exp', 'auth_time', 'nonce', 'preferred_username', 'name', 'email', 'email_verified'];

function formatValue(key, value) {
  if (key === 'iat' || key === 'exp' || key === 'auth_time') {
    return `${value}  (${new Date(value * 1000).toLocaleTimeString()})`;
  }
  return String(value);
}

export default function Result() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetch(`${RP_BACKEND}/me`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'not signed in');
        return res.json();
      })
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: err.message }));
  }, []);

  async function handleLogout() {
    const res = await fetch(`${RP_BACKEND}/logout`, { method: 'POST', credentials: 'include' });
    const { opLogoutUrl } = await res.json();
    window.location.href = opLogoutUrl;
  }

  if (state.loading) {
    return (
      <main className="page">
        <div className="card"><p className="spinner-text">Asking the RP backend for /me&hellip;</p></div>
      </main>
    );
  }

  if (state.error) {
    return (
      <main className="page">
        <div className="card">
          <div className="badge">demo app</div>
          <h1>Not signed in</h1>
          <div className="error-box">GET /me returned: {state.error}</div>
          <p className="lede">Go back and log in first.</p>
          <a href="/"><button className="ghost">Back to login</button></a>
        </div>
      </main>
    );
  }

  const { claims, accessToken, hasRefreshToken, expiresAt } = state.data;
  const claimKeys = [...CLAIM_ORDER.filter((k) => k in claims), ...Object.keys(claims).filter((k) => !CLAIM_ORDER.includes(k))];

  return (
    <main className="page">
      <div className="card">
        <div className="top-row">
          <div className="badge">signed in</div>
          <button className="ghost" onClick={handleLogout}>Log out</button>
        </div>
        <h1>Welcome, {claims.preferred_username || claims.sub}</h1>
        <p className="lede">
          This is what the RP backend&rsquo;s session holds &mdash; the React
          app never touched the token exchange itself, it only read this back
          from <code>GET /me</code>.
        </p>

        <div className="field">
          <div className="field-label">ID token claims</div>
          <table className="claims-table">
            <tbody>
              {claimKeys.map((k) => (
                <tr key={k}><td>{k}</td><td>{formatValue(k, claims[k])}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="field">
          <div className="field-label">Access token (opaque, not a JWT)</div>
          <div className="field-value">{showToken ? accessToken : `${accessToken.slice(0, 10)}${'•'.repeat(24)}`}</div>
          <button className="token-toggle" onClick={() => setShowToken((s) => !s)}>
            {showToken ? 'Hide' : 'Show full token'}
          </button>
        </div>

        <div className="field">
          <div className="field-label">Session</div>
          <div className="field-value">
            refresh_token issued: {hasRefreshToken ? 'yes' : 'no'}
            <br />
            access token expires: {new Date(expiresAt).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </main>
  );
}
