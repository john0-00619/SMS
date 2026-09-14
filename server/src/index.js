import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { authOptional } from "./middleware/auth.js";
import chatRoutes from "./routes/chat.js";
import scriptRoutes from "./routes/scripts.js";
import imageRoutes from "./routes/images.js";
import videoRoutes from "./routes/videos.js";
import voiceRoutes from "./routes/voices.js";
import { MODELS } from "./config.js";
import { listModelsSafe } from "./gemini.js";

const app = express();
const PORT = process.env.PORT || 8080;

const allowed = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowed.includes("*") || allowed.includes(origin)) return cb(null, true);
    // Allow any localhost + e2b/arena preview hosts for dev previews
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    if (/\.e2b\.app$/.test(new URL(origin).hostname)) return cb(null, true);
    if (/\.web\.app$|\.firebaseapp\.com$/.test(new URL(origin).hostname)) return cb(null, true);
    return cb(null, true); // lenient: API key stays server-side; Firebase rules protect data
  },
  credentials: true,
}));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(morgan("dev"));
app.use(authOptional);

// Rate limits: generous for text, strict for expensive media
const textLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const mediaLimiter = rateLimit({ windowMs: 60_000, max: 12, standardHeaders: true, legacyHeaders: false });
const videoLimiter = rateLimit({ windowMs: 60_000, max: 4, standardHeaders: true, legacyHeaders: false });

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    models: MODELS,
    time: new Date().toISOString(),
  });
});

app.get("/api/models", async (_req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: { code: "CONFIG_REQUIRED", message: "GEMINI_API_KEY not configured." }, configured: MODELS });
  }
  const live = await listModelsSafe();
  res.json({ configured: MODELS, live });
});

app.use("/api/chat", textLimiter, chatRoutes);
app.use("/api/scripts", textLimiter, scriptRoutes);
app.use("/api/images", mediaLimiter, imageRoutes);
app.use("/api/videos", videoLimiter, videoRoutes);
app.use("/api/voices", mediaLimiter, voiceRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Unknown API route." } }));

// Serve client build in production (single-service deploy)
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  console.log("[server] serving client build from", clientDist);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] Kobina AI Studio API on :${PORT} | gemini=${process.env.GEMINI_API_KEY ? "configured" : "MISSING"}`);
});
