import { auth } from "./firebase";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function headers(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  try {
    const token = await auth?.currentUser?.getIdToken?.();
    if (token) h.Authorization = `Bearer ${token}`;
    else if (auth?.currentUser) h["x-dev-uid"] = auth.currentUser.uid;
  } catch {}
  return h;
}

export function apiUrl(path) {
  return `${BASE}${path}`;
}

export async function apiFetch(path, { method = "GET", body, signal } = {}) {
  const res = await fetch(apiUrl(path), {
    method,
    headers: await headers(),
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Request failed (${res.status})`);
    err.code = data?.error?.code || "REQUEST_FAILED";
    err.status = res.status;
    throw err;
  }
  return data;
}

// SSE streaming chat with abort support
export async function streamChat(messages, { onToken, signal }) {
  const res = await fetch(apiUrl("/api/chat/stream"), {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const p of parts) {
      const line = p.trim();
      if (!line.startsWith("data:")) continue;
      try {
        const evt = JSON.parse(line.slice(5));
        if (evt.text) { full += evt.text; onToken?.(evt.text, full); }
        if (evt.error) throw new Error(evt.error);
        if (evt.done) return full;
      } catch (e) {
        if (e.message && !e.message.includes("JSON")) throw e;
      }
    }
  }
  return full;
}

export const friendlyError = (e) => e?.message || "Something went wrong. Please try again.";
