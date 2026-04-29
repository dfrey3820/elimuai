import { getAuthToken, getAuthHeader } from "./auth";

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_BASE_URL || "")
  : "";

export async function apiPost(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const isJson = r.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await r.json() : null;
  if (!r.ok) {
    const validationMsg = Array.isArray(data?.errors)
      ? data.errors.map((e) => e.msg).filter(Boolean).join(", ")
      : null;
    const err = new Error(data?.error || validationMsg || `Request failed (${r.status})`);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiGet(path, params) {
  const qs = params
    ? new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null && v !== "")
      ).toString()
    : "";
  const url = qs ? `${API_BASE}${path}?${qs}` : `${API_BASE}${path}`;
  const r = await fetch(url, {
    headers: { ...getAuthHeader() },
    credentials: "include",
  });
  const isJson = r.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await r.json() : null;
  if (!r.ok) {
    const validationMsg = Array.isArray(data?.errors)
      ? data.errors.map((e) => e.msg).filter(Boolean).join(", ")
      : null;
    const err = new Error(data?.error || validationMsg || `Request failed (${r.status})`);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}
