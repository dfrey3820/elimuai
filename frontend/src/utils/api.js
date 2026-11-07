import { getAuthToken, getAuthHeader } from "./auth";

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_BASE_URL || "")
  : "";

// Friendly fallbacks by status so users never see raw "Request failed (401)".
const STATUS_MESSAGES = {
  400: "Invalid request. Please check your details and try again.",
  401: "Incorrect email or password. Please try again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That already exists.",
  422: "Some fields are invalid. Please review and try again.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again shortly.",
  502: "The server is temporarily unavailable. Please try again shortly.",
  503: "The server is temporarily unavailable. Please try again shortly.",
};

// Extract a human-friendly message from a failed response body.
// Handles Node (`error`/`errors`), FastAPI (`detail`), and generic `message`.
function extractError(data, status) {
  let detailMsg = null;
  if (typeof data?.detail === "string") {
    detailMsg = data.detail;
  } else if (Array.isArray(data?.detail)) {
    // FastAPI/Pydantic validation errors: [{ loc, msg, type }]
    detailMsg = data.detail.map((e) => e.msg).filter(Boolean).join(", ");
  }
  const validationMsg = Array.isArray(data?.errors)
    ? data.errors.map((e) => e.msg).filter(Boolean).join(", ")
    : null;
  return (
    data?.error ||
    detailMsg ||
    validationMsg ||
    data?.message ||
    STATUS_MESSAGES[status] ||
    `Request failed (${status})`
  );
}

function buildError(data, status) {
  const err = new Error(extractError(data, status));
  err.status = status;
  err.data = data;
  return err;
}

export async function apiPost(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const isJson = r.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await r.json() : null;
  if (!r.ok) throw buildError(data, r.status);
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
  if (!r.ok) throw buildError(data, r.status);
  return data;
}

export async function apiDelete(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = r.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await r.json() : null;
  if (!r.ok) throw buildError(data, r.status);
  return data;
}

export async function apiPatch(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = r.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await r.json() : null;
  if (!r.ok) throw buildError(data, r.status);
  return data;
}

export async function apiPut(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = r.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await r.json() : null;
  if (!r.ok) throw buildError(data, r.status);
  return data;
}

/**
 * Multipart file upload. Do NOT set Content-Type manually — the browser must
 * set it including the multipart boundary.
 *
 *   apiUpload("/api/exams/papers/upload", { file: myFile })
 *   apiUpload("/api/exams/papers/upload", { file: myFile, note: "…" })
 */
export async function apiUpload(path, fields = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v != null) fd.append(k, v);
  }
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { ...getAuthHeader() }, // no Content-Type — browser sets boundary
    credentials: "include",
    body: fd,
  });
  const isJson = r.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await r.json() : null;
  if (!r.ok) throw buildError(data, r.status);
  return data;
}
