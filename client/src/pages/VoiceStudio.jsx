import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { apiFetch, friendlyError } from "../lib/api";
import { saveGeneration, saveAsset, uploadDataUrl } from "../lib/store";
import { SectionTitle, Spinner, ErrorBanner, EmptyState } from "../components/ui";
import ProjectPicker from "../components/ProjectPicker";
import { b64ToDataUrl, downloadDataUrl } from "../lib/utils";

export default function VoiceStudio() {
  const { user } = useAuth();
  const toast = useToast();
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("Kore");
  const [voices, setVoices] = useState(["Kore"]);
  const [style, setStyle] = useState("");
  const [multi, setMulti] = useState(false);
  const [speakers, setSpeakers] = useState([{ speaker: "Joe", voice: "Kore" }, { speaker: "Jane", voice: "Puck" }]);
  const [projectId, setProjectId] = useState(null);
  const [result, setResult] = useState(null); // {dataUrl, model, voice}
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/voices/voices").then((r) => { setVoices(r.voices || ["Kore"]); }).catch(() => {});
  }, []);

  const generate = async () => {
    if (!text.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const body = { text, voice, style };
      if (multi) body.multiSpeaker = speakers;
      const r = await apiFetch("/api/voices/generate", { method: "POST", body });
      const dataUrl = b64ToDataUrl(r.audioBase64, r.mimeType);
      setResult({ dataUrl, model: r.model, voice: r.voice });
      await saveGeneration(user.uid, {
        type: "voice", prompt: text.slice(0, 500), model: r.model, status: "completed",
        projectId: projectId || null, title: `Voiceover — ${r.voice}`,
        voice: r.voice,
      }).catch(() => {});
      toast.success("Audio generated with Gemini TTS");
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const up = await uploadDataUrl(user.uid, result.dataUrl, `kobina-voice-${Date.now()}.wav`, "generated");
      await saveAsset(user.uid, {
        kind: "audio", name: `Voiceover — ${result.voice}`, url: up.url, storagePath: up.path,
        mimeType: "audio/wav", projectId: projectId || null, prompt: text.slice(0, 500), model: result.model,
      });
      toast.success("Saved to Media Library");
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <SectionTitle title="Voice Studio" sub="Real Gemini text-to-speech — single or multi-speaker, with playback, save & download." />
      <ErrorBanner message={error} onRetry={generate} />
      <div className="grid lg:grid-cols-[340px_1fr] gap-4 mt-4">
        <div className="glass rounded-2xl p-5 space-y-3 h-fit">
          <div><label className="lbl">Script / text * ({text.length}/5000)</label><textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 5000))} rows={6} className="input mt-1 text-sm" placeholder="Paste your voiceover script here…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="lbl">Voice</label><select value={voice} onChange={(e) => setVoice(e.target.value)} className="input mt-1 text-sm">{voices.map((v) => <option key={v}>{v}</option>)}</select></div>
            <div className="flex items-end pb-1"><label className="text-xs text-zinc-300 flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} className="accent-amber-400" /> Multi-speaker</label></div>
          </div>
          {multi && (
            <div className="space-y-2 rounded-xl border border-white/10 p-3 bg-white/[0.02]">
              {speakers.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input value={s.speaker} onChange={(e) => setSpeakers(speakers.map((x, j) => j === i ? { ...x, speaker: e.target.value } : x))} className="input !py-1.5 text-xs" placeholder="Speaker name" />
                  <select value={s.voice} onChange={(e) => setSpeakers(speakers.map((x, j) => j === i ? { ...x, voice: e.target.value } : x))} className="input !py-1.5 text-xs">{voices.map((v) => <option key={v}>{v}</option>)}</select>
                </div>
              ))}
              <p className="text-[11px] text-zinc-500">Format text as: <code>Joe: … Jane: …</code></p>
            </div>
          )}
          <div><label className="lbl">Tone / pacing instruction (optional)</label><input value={style} onChange={(e) => setStyle(e.target.value)} className="input mt-1 text-sm" placeholder="Say warmly and slowly:" /></div>
          <div><label className="lbl">Project</label><div className="mt-1"><ProjectPicker value={projectId} onChange={setProjectId} /></div></div>
          <button onClick={generate} disabled={busy || !text.trim()} className="btn-primary w-full rounded-xl px-4 py-3 text-sm flex items-center justify-center gap-2">
            {busy ? <><Spinner size={16} /> Generating…</> : "♪ Generate Voiceover"}
          </button>
        </div>

        <div className="glass rounded-2xl p-5 sm:p-6 min-h-[300px]">
          {!result ? (
            <EmptyState icon="♪" title="No audio yet" hint="Enter text, pick a Gemini voice, and generate real TTS audio." />
          ) : (
            <div className="fade-up">
              <audio src={result.dataUrl} controls className="w-full" />
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button onClick={generate} disabled={busy} className="btn-ghost rounded-lg px-3 py-2 text-xs font-semibold">↻ Regenerate</button>
                <button onClick={save} disabled={saving} className="btn-ghost rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5">{saving ? <Spinner size={12} /> : "💾"} Save to Library</button>
                <button onClick={() => { downloadDataUrl(result.dataUrl, `kobina-voice-${Date.now()}.wav`); toast.success("Download started"); }} className="btn-primary rounded-lg px-4 py-2 text-xs">⬇ Download WAV</button>
                <span className="text-[11px] text-zinc-500 ml-auto">Model: {result.model} · Voice: {result.voice}</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-3">100% Gemini-generated audio — never browser speech synthesis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
