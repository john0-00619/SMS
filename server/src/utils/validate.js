import { z } from "zod";

export const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "model"]),
    content: z.string().min(1).max(20000),
  })).min(1).max(100),
  stream: z.boolean().optional().default(false),
});

export const scriptSchema = z.object({
  topic: z.string().min(3).max(2000),
  platform: z.string().max(100).default("YouTube Long Form"),
  duration: z.string().max(100).default("5-8 minutes"),
  tone: z.string().max(100).default("Engaging"),
  audience: z.string().max(300).default("General audience"),
  language: z.string().max(100).default("English"),
  style: z.string().max(200).default("Cinematic"),
  goal: z.string().max(500).default("Entertain and grow subscribers"),
});

export const imageSchema = z.object({
  prompt: z.string().min(3).max(10000),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:5", "3:2"]).default("16:9"),
  negativePrompt: z.string().max(2000).optional().default(""),
  referenceImage: z.string().max(15_000_000).optional(), // base64 data URL
  referenceMimeType: z.string().max(100).optional().default("image/png"),
});

export const videoSchema = z.object({
  prompt: z.string().min(3).max(5000),
  aspectRatio: z.enum(["16:9", "9:16"]).default("16:9"),
  referenceImage: z.string().max(15_000_000).optional(),
  referenceMimeType: z.string().max(100).optional().default("image/png"),
});

export const ttsSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().max(50).default("Kore"),
  style: z.string().max(500).optional().default(""),
  multiSpeaker: z.array(z.object({
    speaker: z.string().max(50),
    voice: z.string().max(50),
  })).max(4).optional(),
});

export const youtubeSchema = z.object({
  topic: z.string().min(3).max(10000),
  kind: z.enum(["full", "titles", "description", "shorts", "chapters", "tags"]).default("full"),
});

export const thumbnailSchema = z.object({
  topic: z.string().min(3).max(2000),
  title: z.string().max(300).optional().default(""),
  concept: z.string().max(2000).optional().default(""),
  style: z.string().max(200).optional().default("Cinematic, high contrast"),
  referenceImage: z.string().max(15_000_000).optional(),
  referenceMimeType: z.string().max(100).optional().default("image/png"),
});

export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ").slice(0, 500),
        },
      });
    }
    req.validated = parsed.data;
    next();
  };
}
