import { Router } from "express";
import { ai, withRetry } from "../gemini.js";
import { MODELS } from "../config.js";
import { validate, videoSchema } from "../utils/validate.js";
import { sendError, requireApiKey } from "../utils/errors.js";
import { z } from "zod";

const router = Router();
// In-memory operation registry (per server instance). Client also persists op name in Firestore.
const ops = new Map(); // opName -> { name, model, prompt, aspectRatio, status, createdAt, videoUri?, error? }

// POST /api/videos/generate — start a real Veo operation
router.post("/generate", requireApiKey, validate(videoSchema), async (req, res) => {
  try {
    const { prompt, aspectRatio, referenceImage, referenceMimeType } = req.validated;
    const modelsToTry = [MODELS.video, MODELS.videoFallback].filter((v, i, a) => v && a.indexOf(v) === i);
    let operation = null, usedModel = null, lastErr = null;
    for (const model of modelsToTry) {
      try {
        const source = { prompt };
        if (referenceImage) {
          const b64 = referenceImage.includes(",") ? referenceImage.split(",").pop() : referenceImage;
          source.image = { imageBytes: b64, mimeType: referenceMimeType || "image/png" };
        }
        const params = { model, source, config: { aspectRatio, numberOfVideos: 1 } };
        operation = await withRetry(() => ai().models.generateVideos(params), { retries: 1 });
        usedModel = model;
        break;
      } catch (e) {
        lastErr = e;
        const tryNext = e?.status === 404 || /not found|unknown model/i.test(String(e?.message || ""));
        if (!tryNext) throw e;
      }
    }
    if (!operation) throw lastErr || new Error("Video generation failed to start");
    const name = operation.name || `operations/${Date.now()}`;
    ops.set(name, { name, model: usedModel, prompt: prompt.slice(0, 500), aspectRatio, status: "queued", createdAt: Date.now(), raw: !!operation.done });
    // If it somehow completed synchronously, capture it
    if (operation.done) {
      const rec = ops.get(name);
      const uri = operation?.response?.generatedVideos?.[0]?.video?.uri;
      rec.status = uri ? "completed" : "failed";
      if (uri) rec.videoUri = uri;
    }
    res.json({ operationName: name, model: usedModel, status: ops.get(name).status });
  } catch (e) {
    sendError(res, e, "Video generation failed to start. Veo may not be enabled for this project.");
  }
});

// GET /api/videos/status?name=... — poll real operation status
router.get("/status", requireApiKey, async (req, res) => {
  try {
    const name = String(req.query.name || "");
    if (!name) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Missing operation name." } });
    let operation;
    try {
      operation = await ai().operations.getVideosOperation({ operation: { name } });
    } catch (e) {
      // Fall back to local record with honest state
      const rec = ops.get(name);
      if (rec) return res.json({ ...rec, note: "Live poll unavailable; showing last known state." });
      throw e;
    }
    const rec = ops.get(name) || { name, model: MODELS.video, status: "generating", createdAt: Date.now() };
    if (operation.done) {
      const err = operation.error;
      if (err) {
        rec.status = "failed";
        rec.error = String(err.message || "Video generation failed").slice(0, 400);
      } else {
        const v = operation?.response?.generatedVideos?.[0]?.video;
        if (v?.uri) {
          rec.status = "completed";
          rec.videoUri = v.uri;
        } else {
          rec.status = "failed";
          rec.error = "Operation completed without a video URI.";
        }
      }
    } else {
      rec.status = "generating";
      rec.metadata = operation.metadata ? JSON.stringify(operation.metadata).slice(0, 500) : undefined;
    }
    ops.set(name, rec);
    res.json(rec);
  } catch (e) {
    sendError(res, e, "Could not poll video status.");
  }
});

// GET /api/videos/download?name=... — proxy the real generated file (adds API key server-side)
router.get("/download", requireApiKey, async (req, res) => {
  try {
    const name = String(req.query.name || "");
    const rec = ops.get(name);
    const uri = rec?.videoUri;
    if (!uri) return res.status(404).json({ error: { code: "NOT_READY", message: "Video is not ready yet or operation unknown to this server instance." } });
    const key = process.env.GEMINI_API_KEY;
    const url = uri.includes("key=") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
    const upstream = await fetch(url);
    if (!upstream.ok) throw Object.assign(new Error(`Upstream fetch failed: ${upstream.status}`), { status: 502 });
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="kobina-video-${Date.now()}.mp4"`);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    sendError(res, e, "Video download failed.");
  }
});

// GET /api/videos/stream?name=... — inline playback of the real file
router.get("/stream", requireApiKey, async (req, res) => {
  try {
    const name = String(req.query.name || "");
    const rec = ops.get(name);
    const uri = rec?.videoUri;
    if (!uri) return res.status(404).json({ error: { code: "NOT_READY", message: "Video is not ready yet." } });
    const key = process.env.GEMINI_API_KEY;
    const url = uri.includes("key=") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
    const upstream = await fetch(url);
    if (!upstream.ok) throw Object.assign(new Error(`Upstream fetch failed: ${upstream.status}`), { status: 502 });
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp4");
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    sendError(res, e, "Video stream failed.");
  }
});

export default router;
