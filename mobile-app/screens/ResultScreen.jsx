import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { RP_BACKEND_URL } from '../lib/config';
import { getToken, clearToken } from '../lib/session';
import { runLoginFlow } from '../lib/login';

const CLAIM_ORDER = ['sub', 'iss', 'aud', 'iat', 'exp', 'auth_time', 'nonce', 'preferred_username', 'phone_number', 'phone_number_verified'];

function formatValue(key, value) {
  if (key === 'iat' || key === 'exp' || key === 'auth_time') {
    return `${value}  (${new Date(value * 1000).toLocaleTimeString()})`;
  }
  return String(value);
}

export default function ResultScreen({ onLoggedOut }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [showToken, setShowToken] = useState(false);
  const [reauthBusy, setReauthBusy] = useState(false);
  const [reauthError, setReauthError] = useState(null);

  async function loadMe() {
    const token = await getToken();
    try {
      const res = await fetch(`${RP_BACKEND_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json()).error || 'not signed in');
      setState({ loading: false, data: await res.json(), error: null });
    } catch (e) {
      setState({ loading: false, data: null, error: e.message });
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function handleLogout() {
    const token = await getToken();
    const res = await fetch(`${RP_BACKEND_URL}/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const { opLogoutUrl } = await res.json();
    await clearToken();
    // Also terminate the OP's own SSO session, same as the web app does —
    // optional for this app's own state (already cleared above), but keeps
    // behavior consistent with the web frontend's logout button.
    Linking.openURL(opLogoutUrl).catch(() => {});
    onLoggedOut();
  }

  // Re-runs the login journey again without logging out first — handy for
  // watching the flow repeatedly, or for seeing a fresh code/token/session
  // minted for the same account. isOpenCongrate controls whether the
  // congrats page is shown before finishing (see oidc-provider's
  // /authorize and /api/interaction/[uid]/consent routes).
  async function handleReopenAuth(isOpenCongrate) {
    setReauthError(null);
    setReauthBusy(true);
    try {
      const session = await runLoginFlow({ isOpenCongrate });
      if (session) {
        setState({ loading: true, data: null, error: null });
        await loadMe();
      }
    } catch (e) {
      setReauthError(e.message);
    } finally {
      setReauthBusy(false);
    }
  }

  if (state.loading) {
    return (
      <View style={styles.page}>
        <ActivityIndicator color="#7ad0ff" />
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.badge}>MOBILE APP</Text>
          <Text style={styles.title}>Not signed in</Text>
          <Text style={styles.error}>GET /me returned: {state.error}</Text>
          <Pressable style={styles.ghostButton} onPress={onLoggedOut}>
            <Text style={styles.ghostButtonText}>Back to login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { claims, accessToken, hasRefreshToken, expiresAt } = state.data;
  const claimKeys = [...CLAIM_ORDER.filter((k) => k in claims), ...Object.keys(claims).filter((k) => !CLAIM_ORDER.includes(k))];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.badge}>SIGNED IN</Text>
          <Pressable onPress={handleLogout}>
            <Text style={styles.ghostButtonText}>Log out</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Welcome, {claims.preferred_username || claims.sub}</Text>
        <Text style={styles.lede}>
          This is what rp-backend's session holds, read back from GET /me using the bearer token
          this app got from the mobile handoff — the app never saw the token exchange itself.
        </Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ID TOKEN CLAIMS</Text>
          {claimKeys.map((k) => (
            <View key={k} style={styles.claimRow}>
              <Text style={styles.claimKey}>{k}</Text>
              <Text style={styles.claimValue}>{formatValue(k, claims[k])}</Text>
            </View>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ACCESS TOKEN (OPAQUE, NOT A JWT)</Text>
          <Text style={styles.fieldValue}>{showToken ? accessToken : `${accessToken.slice(0, 10)}${'•'.repeat(24)}`}</Text>
          <Pressable onPress={() => setShowToken((s) => !s)}>
            <Text style={styles.tokenToggle}>{showToken ? 'Hide' : 'Show full token'}</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>SESSION</Text>
          <Text style={styles.fieldValue}>refresh_token issued: {hasRefreshToken ? 'yes' : 'no'}</Text>
          <Text style={styles.fieldValue}>access token expires: {new Date(expiresAt).toLocaleTimeString()}</Text>
        </View>

        {reauthError && <Text style={styles.error}>{reauthError}</Text>}

        <Pressable style={styles.reopenButton} onPress={() => handleReopenAuth(false)} disabled={reauthBusy}>
          {reauthBusy ? (
            <ActivityIndicator color="#e7e9ee" />
          ) : (
            <Text style={styles.reopenButtonText}>Reopen auth page</Text>
          )}
        </Pressable>
        <Text style={styles.reopenHint}>
          Replaces this session with a fresh one, straight through — no congrats page.
        </Text>

        <Pressable style={styles.reopenButton} onPress={() => handleReopenAuth(true)} disabled={reauthBusy}>
          {reauthBusy ? (
            <ActivityIndicator color="#e7e9ee" />
          ) : (
            <Text style={styles.reopenButtonText}>Reopen auth page (show congrats)</Text>
          )}
        </Pressable>
        <Text style={styles.reopenHint}>
          Same, but with ?isOpenCongrate=true — you'll see the congrats page (Step 5) before it finishes.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0f1115' },
  pageContent: { padding: 24, alignItems: 'center' },
  card: { width: '100%', maxWidth: 480, backgroundColor: '#171a21', borderRadius: 14, borderWidth: 1, borderColor: '#2a2f3a', padding: 24, marginTop: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { color: '#7ad0ff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { color: '#e7e9ee', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  lede: { color: '#9aa2b1', fontSize: 13, lineHeight: 19, marginBottom: 20 },
  error: { color: '#ff9b9b', fontSize: 13, marginTop: 16 },
  field: { marginTop: 16, padding: 14, backgroundColor: '#12151b', borderRadius: 10, borderWidth: 1, borderColor: '#2a2f3a' },
  fieldLabel: { color: '#6f7889', fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  fieldValue: { color: '#d7dbe4', fontSize: 12, fontFamily: 'Courier', marginTop: 2 },
  claimRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#22262f' },
  claimKey: { color: '#6f7889', fontSize: 11, fontFamily: 'Courier', flexShrink: 0, marginRight: 10 },
  claimValue: { color: '#d7dbe4', fontSize: 11, fontFamily: 'Courier', flexShrink: 1, textAlign: 'right' },
  tokenToggle: { color: '#7ad0ff', fontSize: 11, marginTop: 8 },
  ghostButton: { marginTop: 18, borderWidth: 1, borderColor: '#2a2f3a', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  ghostButtonText: { color: '#e7e9ee', fontSize: 13, fontWeight: '600' },
  reopenButton: { marginTop: 20, borderWidth: 1, borderColor: '#2a2f3a', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  reopenButtonText: { color: '#e7e9ee', fontSize: 14, fontWeight: '700' },
  reopenHint: { color: '#6f7889', fontSize: 11, lineHeight: 15, marginTop: 8, textAlign: 'center' },
});
