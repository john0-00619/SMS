// Centralized model configuration — change model IDs here only.
export const MODELS = {
  // Text / chat / scripts / youtube / thumbnails-text
  text: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash",
  textFallback: process.env.GEMINI_TEXT_MODEL_FALLBACK || "gemini-2.0-flash",
  // Native image generation (Nano Banana family)
  image: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
  imageFallback: process.env.GEMINI_IMAGE_MODEL_FALLBACK || "gemini-2.0-flash-preview-image-generation",
  // Video generation (Veo)
  video: process.env.GEMINI_VIDEO_MODEL || "veo-3.1-generate-preview",
  videoFallback: process.env.GEMINI_VIDEO_MODEL_FALLBACK || "veo-3.0-generate-preview",
  // Text-to-speech
  tts: process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts",
  ttsPro: process.env.GEMINI_TTS_MODEL_PRO || "gemini-2.5-pro-preview-tts",
};

export const TTS_VOICES = [
  "Kore", "Puck", "Charon", "Fenrir", "Aoede",
  "Leda", "Callirrhoe", "Autonoe", "Enceladus", "Iapetus",
  "Umbriel", "Algieba", "Despina", "Erinome", "Algenib",
  "Rasalgethi", "Laomedeia", "Alnilam", "Schedar", "Gacrux",
  "Pulcherrima", "Achird", "Zubenelgenubi", "Vindemiatrix",
  "Sadachbia", "Sadaltager", "Sulafat",
];

export const VIDEO_ASPECTS = ["16:9", "9:16"];
export const IMAGE_ASPECTS = ["1:1", "16:9", "9:16", "4:5", "3:2"];

export const LIMITS = {
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || "50", 10),
  chatMaxMessages: 100,
  promptMaxChars: 20000,
  ttsMaxChars: 5000,
};
