import { Router } from "express";
import { ai, withRetry, extractInlineData } from "../gemini.js";
import { MODELS } from "../config.js";
import { validate, imageSchema, thumbnailSchema } from "../utils/validate.js";
import { sendError, requireApiKey } from "../utils/errors.js";

const router = Router();

function aspectHint(ratio) {
  const map = {
    "1:1": "square 1:1 composition",
    "16:9": "widescreen 16:9 cinematic composition",
    "9:16": "vertical 9:16 portrait composition for Shorts/Reels/TikTok",
    "4:5": "vertical 4:5 portrait composition",
    "3:2": "landscape 3:2 photographic composition",
  };
  return map[ratio] || "16:9 composition";
}

async function generateImage({ prompt, aspectRatio, negativePrompt, referenceImage, referenceMimeType }) {
  let fullPrompt = `${prompt}\n\nStyle: ${aspectHint(aspectRatio)}. High detail, professional quality.`;
  if (negativePrompt) fullPrompt += `\nAvoid: ${negativePrompt}`;
  const tryModels = [MODELS.image, MODELS.imageFallback].filter((v, i, a) => v && a.indexOf(v) === i);
  let lastErr;
  for (const model of tryModels) {
    try {
      let contents;
      if (referenceImage) {
        const b64 = referenceImage.includes(",") ? referenceImage.split(",").pop() : referenceImage;
        contents = [
          { text: `Edit/extend this reference image per instructions. Keep subject identity consistent.\n\n${fullPrompt}` },
          { inlineData: { mimeType: referenceMimeType || "image/png", data: b64 } },
        ];
      } else {
        contents = fullPrompt;
      }
      const response = await withRetry(() =>
        ai().models.generateContent({
          model,
          contents,
          config: { responseModalities: ["TEXT", "IMAGE"] },
        })
      );
      const { data, mimeType, text } = extractInlineData(response, "image/");
      if (!data) throw Object.assign(new Error("Model returned no image. Try a different prompt."), { status: 422 });
      return { imageBase64: data, mimeType: mimeType || "image/png", text: text || "", model };
    } catch (e) {
      lastErr = e;
      const retryable404 = e?.status === 404 || /not found|unknown model/i.test(String(e?.message || ""));
      if (!retryable404) throw e;
    }
  }
  throw lastErr;
}

router.post("/generate", requireApiKey, validate(imageSchema), async (req, res) => {
  try {
    const result = await generateImage(req.validated);
    res.json(result);
  } catch (e) {
    sendError(res, e, "Image generation failed. Please retry.");
  }
});

// POST /api/images/thumbnail — text plan + generated 16:9 image
router.post("/thumbnail", requireApiKey, validate(thumbnailSchema), async (req, res) => {
  try {
    const { topic, title, concept, style, referenceImage, referenceMimeType } = req.validated;
    const planRes = await withRetry(() =>
      ai().models.generateContent({
        model: MODELS.text,
        contents: `YouTube thumbnail expert. Video topic: ${topic}\nTitle: ${title || "(none yet)"}\nConcept: ${concept || "(open)"}\nStyle: ${style}\n\nReturn Markdown with ## Concepts (3 numbered ideas), ## Thumbnail Text (5 ultra-short options, max 4 words each), ## Image Prompt (one detailed image-generation prompt, no text in image unless simple).`,
      })
    );
    const plan = planRes.text || "";
    const m = plan.match(/## Image Prompt([\s\S]*?)(## |$)/i);
    const imagePrompt = (m ? m[1].trim() : `Cinematic YouTube thumbnail for: ${topic}. ${style}. 16:9, bold subject, dramatic lighting, high contrast, no text.`).slice(0, 2000);
    const img = await generateImage({ prompt: imagePrompt, aspectRatio: "16:9", referenceImage, referenceMimeType });
    res.json({ plan, imagePrompt, ...img });
  } catch (e) {
    sendError(res, e, "Thumbnail generation failed. Please retry.");
  }
});

export default router;
