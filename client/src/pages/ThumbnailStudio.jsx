import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { apiFetch, friendlyError } from "../lib/api";
import { saveGeneration, saveAsset, uploadDataUrl } from "../lib/store";
import { SectionTitle, Spinner, ErrorBanner, EmptyState, Markdown, CopyButton } from "../components/ui";
import ProjectPicker from "../components/ProjectPicker";
import { b64ToDataUrl, downloadDataUrl, fileToDataUrl, validateUpload } from "../lib/utils";

const STYLES = ["Cinematic, high contrast", "Bold MrBeast-style", "Minimalist premium", "Neon cyberpunk", "Documentary realism", "Vibrant cartoon"];

export default function ThumbnailStudio() {
  const { user } = useAuth();
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [concept, setConcept] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [projectId, setProjectId] = useState(null);
  const [reference, setReference] = useState(null);
  const [result, setResult] = useState(null); // {plan, imagePrompt, dataUrl, model}
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onRef = async (f) => {
    const err = validateUpload(f, { types: ["image/"], maxMb: 10 });
    if (err) return toast.error(err);
    setReference(await fileToDataUrl(f));
  };

  const generate = async () => {
    if (!topic.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const body = { topic, title, concept, style };
      if (reference) {
        body.referenceImage = reference;
        body.referenceMimeType = reference.match(/data:(.*?);/)?.[1] || "image/png";
      }
      const r = await apiFetch("/api/images/thumbnail", { method: "POST", body });
      setResult({ plan: r.plan, imagePrompt: r.imagePrompt, dataUrl: b64ToDataUrl(r.imageBase64, r.mimeType), model: r.model });
      await saveGeneration(user.uid, {
        type: "thumbnail", prompt: topic, model: r.model, status: "completed",
        projectId: projectId || null, title: title || topic.slice(0, 80),
        previewDataUrl: b64ToDataUrl(r.imageBase64, r.mimeType).slice(0, 400000),
      }).catch(() => {});
      toast.success("Thumbnail concepts + 16:9 image generated");
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const up = await uploadDataUrl(user.uid, result.dataUrl, `kobina-thumbnail-${Date.now()}.png`);
      await saveAsset(user.uid, {
        kind: "image", name: `Thumbnail — ${topic.slice(0, 50)}`, url: up.url, storagePath: up.path,
        mimeType: "image/png", projectId: projectId || null, prompt: result.imagePrompt, model: result.model,
      });
      toast.success("Saved to Media Library");
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <SectionTitle title="Thumbnail Studio" sub="CTR concepts, short thumbnail text, and a real 16:9 AI-generated thumbnail image." />
      <ErrorBanner message={error} onRetry={generate} />
      <div className="grid lg:grid-cols-[340px_1fr] gap-4 mt-4">
        <div className="glass rounded-2xl p-5 space-y-3 h-fit">
          <div><label className="lbl">Video topic *</label><textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} className="input mt-1 text-sm" placeholder="I Survived 24 Hours in a Tiny Home" /></div>
          <div><label className="lbl">Video title (optional)</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1 text-sm" /></div>
          <div><label className="lbl">Concept (optional)</label><input value={concept} onChange={(e) => setConcept(e.target.value)} className="input mt-1 text-sm" placeholder="shocked face, red arrow, tiny home…" /></div>
          <div><label className="lbl">Visual style</label><select value={style} onChange={(e) => setStyle(e.target.value)} className="input mt-1 text-sm">{STYLES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div>
            <label className="lbl">Reference (optional)</label>
            {reference ? (
              <div className="mt-1.5 relative">
                <img src={reference} alt="ref" className="rounded-xl w-full max-h-32 object-cover border border-white/10" />
                <button onClick={() => setReference(null)} className="absolute top-2 right-2 btn-ghost rounded-lg px-2 py-1 text-[11px]">✕</button>
              </div>
            ) : (
              <label className="mt-1.5 block rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-3 text-center text-xs text-zinc-400 cursor-pointer hover:border-amber-400/50">
                ⬆ Upload reference
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onRef(e.target.files[0])} />
              </label>
            )}
          </div>
          <div><label className="lbl">Project</label><div className="mt-1"><ProjectPicker value={projectId} onChange={setProjectId} /></div></div>
          <button onClick={generate} disabled={busy || !topic.trim()} className="btn-primary w-full rounded-xl px-4 py-3 text-sm flex items-center justify-center gap-2">
            {busy ? <><Spinner size={16} /> Generating…</> : "▣ Generate Thumbnail"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 sm:p-6">
            {!result ? (
              <EmptyState icon="▣" title="No thumbnail yet" hint="Enter your video topic and generate concepts plus a 16:9 image." />
            ) : (
              <div className="fade-up">
                <img src={result.dataUrl} alt="thumbnail" className="rounded-2xl w-full border border-white/10 shadow-2xl" style={{ aspectRatio: "16/9", objectFit: "cover" }} />
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={generate} disabled={busy} className="btn-ghost rounded-lg px-3 py-2 text-xs font-semibold">↻ Regenerate</button>
                  <button onClick={save} disabled={saving} className="btn-ghost rounded-lg px-3 py-2 text-xs font-semibold">{saving ? "Saving…" : "💾 Save"}</button>
                  <button onClick={() => { downloadDataUrl(result.dataUrl, `kobina-thumbnail-${Date.now()}.png`); toast.success("Download started"); }} className="btn-primary rounded-lg px-4 py-2 text-xs">⬇ Download</button>
                  <span className="text-[11px] text-zinc-500 ml-auto">16:9 · {result.model}</span>
                </div>
              </div>
            )}
          </div>
          {result && (
            <div className="glass rounded-2xl p-5 sm:p-6 fade-up">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-white">Concepts & Text</h3>
                <CopyButton text={result.plan} label="Copy plan" />
              </div>
              <Markdown text={result.plan} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
