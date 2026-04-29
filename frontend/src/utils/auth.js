const AUTH_TOKEN_KEYS = ["accessToken", "token", "jwt", "access_token"];

const isBrowser = typeof window !== "undefined";

export function getAuthToken() {
  if (!isBrowser) return null;
  return AUTH_TOKEN_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
}

export function getAuthHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function hasAuthToken() {
  if (!isBrowser) return false;
  return AUTH_TOKEN_KEYS.some((k) => localStorage.getItem(k));
}

export function setTokens(data) {
  if (!isBrowser) return;
  if (data?.accessToken) localStorage.setItem("accessToken", data.accessToken);
  if (data?.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
}

export function clearTokens() {
  if (!isBrowser) return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}
