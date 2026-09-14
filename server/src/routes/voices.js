import { Router } from "express";
import { ai, withRetry, extractInlineData } from "../gemini.js";
import { MODELS, TTS_VOICES } from "../config.js";
import { validate, ttsSchema } from "../utils/validate.js";
import { sendError, requireApiKey } from "../utils/errors.js";

const router = Router();

router.get("/voices", (_req, res) => res.json({ voices: TTS_VOICES, model: MODELS.tts }));

function wavFromPcm(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;
  header.write("RIFF", 0); header.writeUInt32LE(36 + dataSize, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22); header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * numChannels * bitsPerSample) / 8, 28);
  header.writeUInt16LE((numChannels * bitsPerSample) / 8, 32); header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36); header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

router.post("/generate", requireApiKey, validate(ttsSchema), async (req, res) => {
  try {
    const { text, voice, style, multiSpeaker } = req.validated;
    const contentText = style ? `${style}\n\n${text}` : text;
    let speechConfig;
    if (multiSpeaker && multiSpeaker.length > 1) {
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: multiSpeaker.map((s) => ({
            speaker: s.speaker,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } },
          })),
        },
      };
    } else {
      speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Kore" } } };
    }
    const response = await withRetry(() =>
      ai().models.generateContent({
        model: MODELS.tts,
        contents: [{ parts: [{ text: contentText }] }],
        config: { responseModalities: ["AUDIO"], speechConfig },
      })
    );
    const { data, mimeType } = extractInlineData(response, "audio/");
    if (!data) throw Object.assign(new Error("Model returned no audio."), { status: 422 });
    const pcm = Buffer.from(data, "base64");
    const mime = (mimeType || "").toLowerCase();
    let wavBase64, outMime;
    if (mime.includes("wav") || mime.includes("wave") || mime.includes("x-wav")) {
      wavBase64 = data; outMime = "audio/wav";
    } else {
      // Assume raw PCM 24kHz 16-bit mono → wrap in WAV
      wavBase64 = wavFromPcm(pcm).toString("base64");
      outMime = "audio/wav";
    }
    res.json({ audioBase64: wavBase64, mimeType: outMime, model: MODELS.tts, voice: voice || "Kore" });
  } catch (e) {
    sendError(res, e, "Voice generation failed. Please retry.");
  }
});

export default router;
