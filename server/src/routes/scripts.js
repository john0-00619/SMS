import { Router } from "express";
import { ai, withRetry } from "../gemini.js";
import { MODELS } from "../config.js";
import { validate, scriptSchema, youtubeSchema } from "../utils/validate.js";
import { sendError, requireApiKey } from "../utils/errors.js";

const router = Router();

function scriptPrompt(v) {
  return `You are an elite video scriptwriter for Kobina AI Studio. Write a complete production-ready script package.

Topic: ${v.topic}
Platform: ${v.platform}
Video duration: ${v.duration}
Tone: ${v.tone}
Audience: ${v.audience}
Language: ${v.language}
Style: ${v.style}
Goal: ${v.goal}

Return well-formatted Markdown with EXACTLY these sections (use ## headings):
## Hook
## Full Script
## Scene Breakdown
## Voiceover
## Visual Direction
## B-Roll Ideas
## Camera Directions
## Sound Effects
## Music Direction
## Captions
## Call To Action
## Title Ideas
## Description
## Hashtags

Make it specific, actionable, and production-ready. No filler.`;
}

router.post("/generate", requireApiKey, validate(scriptSchema), async (req, res) => {
  try {
    const response = await withRetry(() =>
      ai().models.generateContent({ model: MODELS.text, contents: scriptPrompt(req.validated) })
    );
    res.json({ text: response.text || "", model: MODELS.text });
  } catch (e) {
    sendError(res, e, "Script generation failed. Please retry.");
  }
});

router.post("/youtube", requireApiKey, validate(youtubeSchema), async (req, res) => {
  try {
    const { topic, kind } = req.validated;
    const prompts = {
      full: `You are a YouTube SEO expert. For this video topic/script:\n${topic}\n\nReturn Markdown with EXACTLY these ## sections:\n## Titles (10 options, numbered)\n## Description (optimized, with keywords + timestamps placeholder)\n## Hook\n## Chapters\n## Tags (comma-separated)\n## Hashtags\n## Pinned Comment\n## Thumbnail Concepts (3)\n## Shorts Caption\n## Community Post\n## Call To Action\n## SEO Keywords`,
      titles: `Generate 10 high-CTR YouTube title options for: ${topic}. Numbered list only.`,
      description: `Write an optimized YouTube description for: ${topic}. Include keywords, value props, timestamps placeholder, and CTA.`,
      shorts: `Write a viral YouTube Shorts caption + hashtags for: ${topic}.`,
      chapters: `Generate video chapters with timestamps for: ${topic}.`,
      tags: `Generate 25 YouTube tags (comma-separated) plus 10 hashtags for: ${topic}.`,
    };
    const response = await withRetry(() =>
      ai().models.generateContent({ model: MODELS.text, contents: prompts[kind] || prompts.full })
    );
    res.json({ text: response.text || "", model: MODELS.text });
  } catch (e) {
    sendError(res, e, "YouTube optimization failed. Please retry.");
  }
});

export default router;
