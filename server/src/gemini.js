import { GoogleGenAI } from "@google/genai";
import { MODELS } from "./config.js";

let client = null;
export function ai() {
  if (!process.env.GEMINI_API_KEY) throw Object.assign(new Error("GEMINI_API_KEY missing"), { status: 503 });
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// Simple retry with exponential backoff for 429/5xx
export async function withRetry(fn, { retries = 2, baseMs = 1200 } = {}) {
  let last;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const status = e?.status || e?.statusCode || e?.response?.status;
      const retryable = status === 429 || (status >= 500 && status < 600) || /fetch failed|ECONN|ETIMEDOUT/i.test(String(e?.message || ""));
      if (!retryable || i === retries) throw e;
      await new Promise((r) => setTimeout(r, baseMs * Math.pow(2, i)));
    }
  }
  throw last;
}

export function extractInlineData(response, mimePrefix) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  let text = "";
  for (const p of parts) {
    if (p.text) text += p.text;
    const inline = p.inlineData || p.inline_data;
    if (inline?.data) {
      const mime = inline.mimeType || inline.mime_type || "";
      if (!mimePrefix || mime.startsWith(mimePrefix)) {
        return { data: inline.data, mimeType: mime || `${mimePrefix}`, text };
      }
    }
  }
  return { data: null, mimeType: null, text };
}

export async function listModelsSafe() {
  try {
    const a = ai();
    const out = [];
    const pager = await a.models.list({ pageSize: 50 });
    for await (const m of pager) {
      out.push({ name: m.name, displayName: m.displayName, supportedActions: m.supportedActions });
      if (out.length > 60) break;
    }
    return out;
  } catch (e) {
    return { error: String(e?.message || e).slice(0, 300) };
  }
}

export { MODELS };
