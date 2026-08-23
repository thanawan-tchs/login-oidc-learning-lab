export default function Home() {
  return (
    <main className="page">
      <div className="card">
        <div className="eyebrow">OIDC Provider · demo</div>
        <h1>This is the identity broker</h1>
        <p className="lede">
          There&rsquo;s nothing to do here directly &mdash; this server only
          answers OIDC protocol requests (<code>/authorize</code>,{' '}
          <code>/token</code>, <code>/userinfo</code>, <code>/logout</code>)
          and renders the interaction pages a client redirects users into.
          Start the flow from the demo frontend instead.
        </p>
      </div>
    </main>
  );
}
