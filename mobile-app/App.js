import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import ResultScreen from './screens/ResultScreen';
import { getToken } from './lib/session';

export default function App() {
  const [screen, setScreen] = useState('checking'); // 'checking' | 'home' | 'result'

  // If a session token is already stored (app relaunched after a previous
  // login), skip straight to Result — it re-validates against GET /me on
  // its own, so an expired/revoked token just falls through to its error state.
  useEffect(() => {
    getToken().then((token) => setScreen(token ? 'result' : 'home'));
  }, []);

  if (screen === 'checking') return <View style={{ flex: 1, backgroundColor: '#0f1115' }} />;

  return (
    <>
      <StatusBar style="light" />
      {screen === 'home' && <HomeScreen onLoggedIn={() => setScreen('result')} />}
      {screen === 'result' && <ResultScreen onLoggedOut={() => setScreen('home')} />}
    </>
  );
}
