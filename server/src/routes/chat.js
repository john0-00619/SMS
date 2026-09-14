import { Router } from "express";
import { ai, withRetry } from "../gemini.js";
import { MODELS } from "../config.js";
import { validate, chatSchema } from "../utils/validate.js";
import { sendError, requireApiKey } from "../utils/errors.js";

const router = Router();

// POST /api/chat — non-streaming
router.post("/", requireApiKey, validate(chatSchema), async (req, res) => {
  try {
    const { messages } = req.validated;
    const contents = messages.map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const response = await withRetry(() =>
      ai().models.generateContent({ model: MODELS.text, contents })
    ).catch((e) => {
      // fallback model once on 404
      if ((e?.status === 404 || /not found/i.test(String(e?.message))) && MODELS.textFallback !== MODELS.text) {
        return ai().models.generateContent({ model: MODELS.textFallback, contents });
      }
      throw e;
    });
    res.json({ text: response.text || "", model: MODELS.text });
  } catch (e) {
    sendError(res, e, "Chat generation failed. Please retry.");
  }
});

// POST /api/chat/stream — SSE streaming
router.post("/stream", requireApiKey, validate(chatSchema), async (req, res) => {
  try {
    const { messages } = req.validated;
    const contents = messages.map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const stream = await ai().models.generateContentStream({ model: MODELS.text, contents });
    for await (const chunk of stream) {
      const t = chunk.text;
      if (t) res.write(`data: ${JSON.stringify({ text: t })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true, model: MODELS.text })}\n\n`);
    res.end();
  } catch (e) {
    try {
      res.write(`data: ${JSON.stringify({ error: "Chat stream failed" })}\n\n`);
    } catch {}
    res.end();
  }
});

export default router;
