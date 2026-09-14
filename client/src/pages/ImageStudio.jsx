import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { apiFetch, friendlyError } from "../lib/api";
import { saveGeneration, saveAsset, uploadDataUrl } from "../lib/store";
import { SectionTitle, Spinner, ErrorBanner, EmptyState } from "../components/ui";
import ProjectPicker from "../components/ProjectPicker";
import { b64ToDataUrl, downloadDataUrl, fileToDataUrl, validateUpload } from "../lib/utils";

const RATIOS = ["1:1", "16:9", "9:16", "4:5", "3:2"];

export default function ImageStudio() {
  const { user } = useAuth();
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [projectId, setProjectId] = useState(null);
  const [reference, setReference] = useState(null); // dataURL
  const [result, setResult] = useState(null); // {dataUrl, mimeType, model, text}
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onRef = async (f) => {
    const err = validateUpload(f, { types: ["image/"], maxMb: 10 });
    if (err) return toast.error(err);
    setReference(await fileToDataUrl(f));
  };

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const body = { prompt, negativePrompt, aspectRatio };
      if (reference) {
        body.referenceImage = reference;
        body.referenceMimeType = reference.match(/data:(.*?);/)?.[1] || "image/png";
      }
      const r = await apiFetch("/api/images/generate", { method: "POST", body });
      const dataUrl = b64ToDataUrl(r.imageBase64, r.mimeType);
      setResult({ dataUrl, mimeType: r.mimeType, model: r.model, text: r.text });
      await saveGeneration(user.uid, {
        type: "image", prompt, model: r.model, status: "completed",
        projectId: projectId || null, aspectRatio, title: prompt.slice(0, 80),
        // small preview only; full file goes to Storage on Save
        previewDataUrl: dataUrl.slice(0, 400000),
      }).catch(() => {});
      toast.success("Image generated with " + r.model);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const up = await uploadDataUrl(user.uid, result.dataUrl, `kobina-image-${Date.now()}.png`);
      await saveAsset(user.uid, {
        kind: "image", name: `Image — ${prompt.slice(0, 50)}`, url: up.url, storagePath: up.path,
        mimeType: result.mimeType, projectId: projectId || null, prompt, model: result.model,
      });
      toast.success("Saved to Media Library");
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <SectionTitle title="Image Studio" sub="Real Gemini native image generation (Nano Banana). Every image is AI-generated — never stock." />
      <ErrorBanner message={error} onRetry={generate} />
      <div className="grid lg:grid-cols-[340px_1fr] gap-4 mt-4">
        <div className="glass rounded-2xl p-5 space-y-3 h-fit">
          <div><label className="lbl">Prompt *</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="input mt-1 text-sm" placeholder="Cinematic portrait of a filmmaker in a neon-lit studio, shallow depth of field…" /></div>
          <div><label className="lbl">Avoid (optional)</label><input value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} className="input mt-1 text-sm" placeholder="blurry, watermark, extra fingers…" /></div>
          <div>
            <label className="lbl">Aspect ratio</label>
            <div className="grid grid-cols-5 gap-1.5 mt-1.5">
              {RATIOS.map((r) => (
                <button key={r} onClick={() => setAspectRatio(r)} className={`rounded-lg py-2 text-[11px] font-bold border ${aspectRatio === r ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/5 text-zinc-400"}`}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="lbl">Reference image (optional edit mode)</label>
            {reference ? (
              <div className="mt-1.5 relative">
                <img src={reference} alt="reference" className="rounded-xl w-full max-h-40 object-cover border border-white/10" />
                <button onClick={() => setReference(null)} className="absolute top-2 right-2 btn-ghost rounded-lg px-2 py-1 text-[11px]">✕</button>
              </div>
            ) : (
              <label className="mt-1.5 block rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-4 text-center text-xs text-zinc-400 cursor-pointer hover:border-amber-400/50">
                ⬆ Upload reference
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onRef(e.target.files[0])} />
              </label>
            )}
          </div>
          <div><label className="lbl">Project</label><div className="mt-1"><ProjectPicker value={projectId} onChange={setProjectId} /></div></div>
          <button onClick={generate} disabled={busy || !prompt.trim()} className="btn-primary w-full rounded-xl px-4 py-3 text-sm flex items-center justify-center gap-2">
            {busy ? <><Spinner size={16} /> Generating…</> : "◐ Generate Image"}
          </button>
        </div>

        <div className="glass rounded-2xl p-5 sm:p-6 min-h-[400px] flex flex-col">
          {!result ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon="◐" title="No image yet" hint={busy ? "Generating with the Gemini image model…" : "Describe your shot and generate. Results appear here for preview, save and download."} />
            </div>
          ) : (
            <>
              <img src={result.dataUrl} alt="generated" className="rounded-2xl w-full border border-white/10 shadow-2xl fade-up" />
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button onClick={generate} disabled={busy} className="btn-ghost rounded-lg px-3 py-2 text-xs font-semibold">↻ Regenerate</button>
                <button onClick={save} disabled={saving} className="btn-ghost rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5">{saving ? <Spinner size={12} /> : "💾"} Save to Library</button>
                <button onClick={() => { downloadDataUrl(result.dataUrl, `kobina-image-${Date.now()}.png`); toast.success("Download started"); }} className="btn-primary rounded-lg px-4 py-2 text-xs">⬇ Download</button>
                <span className="text-[11px] text-zinc-500 ml-auto">Model: {result.model} · {aspectRatio}</span>
              </div>
              {result.text && <p className="text-xs text-zinc-500 mt-3">{result.text.slice(0, 300)}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
