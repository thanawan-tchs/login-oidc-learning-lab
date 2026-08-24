import * as SecureStore from 'expo-secure-store';

const KEY = 'otpdemo_session_token';

export const getToken = () => SecureStore.getItemAsync(KEY);
export const setToken = (token) => SecureStore.setItemAsync(KEY, token);
export const clearToken = () => SecureStore.deleteItemAsync(KEY);
