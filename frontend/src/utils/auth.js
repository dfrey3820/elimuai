const AUTH_TOKEN_KEYS = ["accessToken", "token", "jwt", "access_token"];
const IMPERSONATION_BACKUP_KEY = "impersonation_backup";

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
  // Also drop any stale impersonation backup so the banner disappears on logout.
  localStorage.removeItem(IMPERSONATION_BACKUP_KEY);
}

// ─── Impersonation ────────────────────────────────────────────────────────
// A super-admin's own tokens are stashed in ``impersonation_backup`` before we
// swap in the impersonated user's tokens. ``stopImpersonation`` restores them.

export function isImpersonating() {
  if (!isBrowser) return false;
  return !!localStorage.getItem(IMPERSONATION_BACKUP_KEY);
}

export function getImpersonationInfo() {
  if (!isBrowser) return null;
  const raw = localStorage.getItem(IMPERSONATION_BACKUP_KEY);
  if (!raw) return null;
  try {
    const backup = JSON.parse(raw);
    return { targetEmail: backup.targetEmail || null, targetName: backup.targetName || null, targetRole: backup.targetRole || null };
  } catch {
    return null;
  }
}

export function startImpersonation(data, targetUser) {
  if (!isBrowser) return;
  if (localStorage.getItem(IMPERSONATION_BACKUP_KEY)) {
    // Already impersonating — refuse to nest.
    throw new Error("You are already impersonating another user. Exit the current impersonation first.");
  }
  const backup = {
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
    targetEmail: targetUser?.email || null,
    targetName: targetUser?.name || null,
    targetRole: targetUser?.role || null,
  };
  localStorage.setItem(IMPERSONATION_BACKUP_KEY, JSON.stringify(backup));
  setTokens(data);
}

export function stopImpersonation() {
  if (!isBrowser) return false;
  const raw = localStorage.getItem(IMPERSONATION_BACKUP_KEY);
  if (!raw) return false;
  try {
    const backup = JSON.parse(raw);
    if (backup.accessToken) localStorage.setItem("accessToken", backup.accessToken);
    else localStorage.removeItem("accessToken");
    if (backup.refreshToken) localStorage.setItem("refreshToken", backup.refreshToken);
    else localStorage.removeItem("refreshToken");
  } catch {
    clearTokens();
  }
  localStorage.removeItem(IMPERSONATION_BACKUP_KEY);
  return true;
}
