import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { runLoginFlow } from '../lib/login';

export default function HomeScreen({ onLoggedIn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin() {
    setError(null);
    setBusy(true);
    try {
      const session = await runLoginFlow();
      if (session) onLoggedIn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.badge}>MOBILE APP</Text>
        <Text style={styles.title}>OTP login demo</Text>
        <Text style={styles.lede}>
          Log in opens the same phone-number and OTP pages the web app uses, in an in-app browser.
          When they finish, rp-backend hands this app a one-time code through a deep link instead
          of a cookie — this app trades that for a bearer session token.
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.button} onPress={handleLogin} disabled={busy}>
          {busy ? <ActivityIndicator color="#0b1420" /> : <Text style={styles.buttonText}>Log in</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0f1115', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#171a21', borderRadius: 14, borderWidth: 1, borderColor: '#2a2f3a', padding: 28 },
  badge: { color: '#7ad0ff', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  title: { color: '#e7e9ee', fontSize: 22, fontWeight: '700', marginBottom: 10 },
  lede: { color: '#9aa2b1', fontSize: 14, lineHeight: 20, marginBottom: 22 },
  error: { color: '#ff9b9b', fontSize: 13, marginBottom: 14 },
  button: { backgroundColor: '#7ad0ff', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  buttonText: { color: '#0b1420', fontSize: 15, fontWeight: '700' },
});
