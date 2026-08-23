import { log } from './log';
import { KEYCLOAK_BASE_URL, KEYCLOAK_REALM, KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET } from './config';

const REALM_URL = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}`;
const ADMIN_URL = `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}`;

// Keycloak never authenticates an end user in this setup — the OP verifies
// the OTP itself and only reaches Keycloak as a service account, over the
// Admin REST API, to keep it as the durable user directory.
let cachedToken;

async function getAdminToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.token;
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: KEYCLOAK_ADMIN_CLIENT_ID,
    client_secret: KEYCLOAK_ADMIN_CLIENT_SECRET,
  });
  const res = await fetch(`${REALM_URL}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Keycloak admin token request failed: ${res.status}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

// Username IS the phone number — no custom user-profile attribute needed,
// which sidesteps Keycloak's declarative User Profile restrictions on
// arbitrary attributes entirely.
export async function findOrCreateUserByPhone(phone) {
  const token = await getAdminToken();
  const headers = { Authorization: `Bearer ${token}` };

  log('OP -> Keycloak', 'GET /admin/realms/demo/users (lookup by phone)', { phone });
  const findRes = await fetch(`${ADMIN_URL}/users?username=${encodeURIComponent(phone)}&exact=true`, { headers });
  if (!findRes.ok) throw new Error(`Keycloak admin user lookup failed: ${findRes.status}`);
  let [user] = await findRes.json();

  if (!user) {
    log('OP -> Keycloak', 'POST /admin/realms/demo/users (create new user)', { phone });
    const createRes = await fetch(`${ADMIN_URL}/users`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: phone, enabled: true }),
    });
    if (!createRes.ok) throw new Error(`Keycloak admin user creation failed: ${createRes.status}`);

    const findAgainRes = await fetch(`${ADMIN_URL}/users?username=${encodeURIComponent(phone)}&exact=true`, { headers });
    [user] = await findAgainRes.json();
  }

  log('OP <- Keycloak', 'resolved user', { id: user.id, username: user.username });

  return {
    accountId: user.id,
    profile: {
      phone_number: phone,
      phone_number_verified: true,
      preferred_username: user.username,
    },
  };
}
