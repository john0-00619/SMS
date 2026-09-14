// Structured error handling — never leak secrets or stack traces to clients.
export function toUserMessage(err, fallback = "Something went wrong. Please try again.") {
  const msg = String(err?.message || "");
  const status = err?.status || err?.statusCode || err?.response?.status;
  if (status === 401 || /api key not valid|invalid api key|unauthenticated/i.test(msg))
    return { status: 401, code: "AUTH_ERROR", message: "Authentication failed. Check the server GEMINI_API_KEY configuration." };
  if (status === 403 || /permission denied|forbidden|billing|location|region/i.test(msg))
    return { status: 403, code: "FORBIDDEN", message: "Access denied for this model or region. It may require billing, allowlisting, or isn't available in your region." };
  if (status === 404 || /not found|not supported|unknown model/i.test(msg))
    return { status: 404, code: "MODEL_UNAVAILABLE", message: "The requested model is unavailable. The server model configuration may need updating." };
  if (status === 429 || /quota|rate limit|resource.?exhausted|too many/i.test(msg))
    return { status: 429, code: "RATE_LIMIT", message: "Quota or rate limit reached. Wait a moment and try again, or check your API plan." };
  if (/safety|blocked|harm|policy/i.test(msg))
    return { status: 422, code: "SAFETY_REFUSAL", message: "The request was blocked by safety filters. Try rephrasing your prompt." };
  if (/fetch failed|network|ECONN|ETIMEDOUT|timeout/i.test(msg))
    return { status: 502, code: "NETWORK_ERROR", message: "Network error contacting the AI service. Check your connection and retry." };
  if (status === 400 || /invalid argument|bad request/i.test(msg))
    return { status: 400, code: "BAD_REQUEST", message: msg.slice(0, 300) || fallback };
  return { status: status && status >= 400 && status < 600 ? status : 500, code: "SERVER_ERROR", message: fallback };
}

export function sendError(res, err, fallback) {
  const { status, code, message } = toUserMessage(err, fallback);
  // Server-side log without secrets
  console.error(`[api:${code}]`, String(err?.message || err).slice(0, 500));
  return res.status(status).json({ error: { code, message } });
}

export function requireApiKey(req, res, next) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: {
        code: "CONFIG_REQUIRED",
        message: "Feature unavailable: GEMINI_API_KEY is not configured on the server. Add it to the server environment / AI Studio Secrets and redeploy.",
      },
    });
  }
  next();
}
