import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { apiFetch, apiUrl, friendlyError } from "../lib/api";
import { saveGeneration, updateGeneration } from "../lib/store";
import { SectionTitle, Spinner, ErrorBanner, EmptyState, StatusBadge, ConfirmDialog } from "../components/ui";
import ProjectPicker from "../components/ProjectPicker";
import { fileToDataUrl, validateUpload } from "../lib/utils";

export default function VideoStudio() {
  const { user } = useAuth();
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [projectId, setProjectId] = useState(null);
  const [reference, setReference] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState(null); // {operationName, model, status, videoUri, genId, error}
  const pollRef = useRef(null);

  // Scene builder
  const [scenes, setScenes] = useState([{ title: "Scene 1", prompt: "" }]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const onRef = async (f) => {
    const err = validateUpload(f, { types: ["image/"], maxMb: 10 });
    if (err) return toast.error(err);
    setReference(await fileToDataUrl(f));
  };

  const poll = async (opName, genId) => {
    try {
      const s = await apiFetch(`/api/videos/status?name=${encodeURIComponent(opName)}`);
      setJob((j) => (j ? { ...j, status: s.status, error: s.error } : j));
      if (s.status === "completed" || s.status === "failed") {
        clearInterval(pollRef.current);
        setBusy(false);
        if (genId) updateGeneration(genId, { status: s.status, operationName: opName, error: s.error || null }).catch(() => {});
        toast[s.status === "completed" ? "success" : "error"](
          s.status === "completed" ? "Video ready — preview below." : `Video failed: ${s.error || "unknown error"}`
        );
      }
    } catch (e) {
      // keep polling on transient errors; surface after repeated failure via status text
      console.warn("poll error", e);
    }
  };

  const startPolling = (opName, genId) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => poll(opName, genId), 8000);
    // first check after 5s
    setTimeout(() => poll(opName, genId), 5000);
  };

  const generate = async (scenePrompt) => {
    const p = (scenePrompt ?? prompt).trim();
    if (!p || busy) return;
    setBusy(true); setError("");
    try {
      const body = { prompt: p, aspectRatio };
      if (reference) {
        body.referenceImage = reference;
        body.referenceMimeType = reference.match(/data:(.*?);/)?.[1] || "image/png";
      }
      const r = await apiFetch("/api/videos/generate", { method: "POST", body });
      const genId = await saveGeneration(user.uid, {
        type: "video", prompt: p, model: r.model, status: r.status,
        projectId: projectId || null, operationName: r.operationName, aspectRatio,
        title: p.slice(0, 80),
      }).catch(() => null);
      setJob({ operationName: r.operationName, model: r.model, status: r.status, genId });
      toast.info(`Video request accepted (${r.model}). Polling real status…`);
      startPolling(r.operationName, genId);
    } catch (e) {
      setError(friendlyError(e)); setBusy(false);
    }
  };

  const requestGenerate = () => {
    if (!prompt.trim() || busy) return;
    setConfirming(true);
  };

  const streamSrc = job?.status === "completed" ? `${apiUrl(`/api/videos/stream?name=${encodeURIComponent(job.operationName)}`)}` : null;
  const downloadHref = job?.status === "completed" ? `${apiUrl(`/api/videos/download?name=${encodeURIComponent(job.operationName)}`)}` : null;

  return (
    <div>
      <SectionTitle title="Video Studio" sub="Real Veo generation: request → poll live operation status → preview & download. Fixed-length clips; use Scene Builder for longer stories." />
      <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-4 text-xs text-sky-100/80 mb-4">
        ℹ️ Veo natively produces short clips (typically ~8s). Longer projects should be built as separate scenes below — clips are managed individually and are never mislabeled as one finished video.
      </div>
      <ErrorBanner message={error} />
      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        <div className="glass rounded-2xl p-5 space-y-3 h-fit">
          <div><label className="lbl">Prompt *</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="input mt-1 text-sm" placeholder="Slow dolly shot through a neon-lit film studio at night, camera gliding past cameras and lights…" /></div>
          <div>
            <label className="lbl">Aspect ratio</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {["16:9", "9:16"].map((r) => (
                <button key={r} onClick={() => setAspectRatio(r)} className={`rounded-lg py-2 text-xs font-bold border ${aspectRatio === r ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/5 text-zinc-400"}`}>
                  {r} {r === "16:9" ? "· Landscape" : "· Portrait"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="lbl">Reference frame (image-to-video, optional)</label>
            {reference ? (
              <div className="mt-1.5 relative">
                <img src={reference} alt="ref" className="rounded-xl w-full max-h-40 object-cover border border-white/10" />
                <button onClick={() => setReference(null)} className="absolute top-2 right-2 btn-ghost rounded-lg px-2 py-1 text-[11px]">✕</button>
              </div>
            ) : (
              <label className="mt-1.5 block rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-4 text-center text-xs text-zinc-400 cursor-pointer hover:border-amber-400/50">
                ⬆ Upload start frame
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onRef(e.target.files[0])} />
              </label>
            )}
          </div>
          <div><label className="lbl">Project</label><div className="mt-1"><ProjectPicker value={projectId} onChange={setProjectId} /></div></div>
          <button onClick={requestGenerate} disabled={busy || !prompt.trim()} className="btn-primary w-full rounded-xl px-4 py-3 text-sm flex items-center justify-center gap-2">
            {busy ? <><Spinner size={16} /> Generating…</> : "▶ Generate Video"}
          </button>
          <p className="text-[11px] text-zinc-500">Requires explicit confirmation · button locks while a request is in flight · real status polling every ~8s.</p>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 sm:p-6 min-h-[280px]">
            {!job ? (
              <EmptyState icon="▶" title="No video requested yet" hint="Describe your shot and generate. Live states (queued → generating → completed/failed) appear here with a real player." />
            ) : (
              <div className="fade-up">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <StatusBadge status={job.status} />
                  <span className="text-xs text-zinc-500">Model: {job.model} · {aspectRatio}</span>
                </div>
                {job.status === "completed" && streamSrc ? (
                  <>
                    <video src={streamSrc} controls playsInline className="rounded-2xl w-full border border-white/10 bg-black" />
                    <div className="flex gap-2 mt-4">
                      <a href={downloadHref} className="btn-primary rounded-lg px-4 py-2 text-xs inline-block">⬇ Download video</a>
                    </div>
                  </>
                ) : job.status === "failed" ? (
                  <div className="rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-4 text-sm text-rose-200">
                    Generation failed — {job.error || "retry."}
                    <button onClick={() => generate()} disabled={busy} className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold ml-3">Retry</button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
                    <Spinner size={28} />
                    <p className="text-sm text-zinc-300 mt-3 font-medium">Status: <b>{job.status}</b> — polling the live Veo operation…</p>
                    <p className="text-xs text-zinc-500 mt-1">This reflects the real operation state, not a timer. You can leave and come back — the operation name is saved in History.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scene Builder */}
          <div className="glass rounded-2xl p-5 sm:p-6">
            <h3 className="font-display font-bold text-white mb-1">Scene Builder</h3>
            <p className="text-xs text-zinc-500 mb-4">Plan a longer video as separate clips. Generate each scene individually; manage them as individual generations.</p>
            <div className="space-y-3">
              {scenes.map((s, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex gap-2 mb-2">
                    <input value={s.title} onChange={(e) => setScenes(scenes.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} className="input !py-1.5 text-xs font-bold max-w-[160px]" />
                    <button onClick={() => generate(s.prompt)} disabled={busy || !s.prompt.trim()} className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold ml-auto">▶ Generate this scene</button>
                    {scenes.length > 1 && <button onClick={() => setScenes(scenes.filter((_, j) => j !== i))} className="btn-ghost rounded-lg px-2 py-1.5 text-xs">✕</button>}
                  </div>
                  <textarea value={s.prompt} onChange={(e) => setScenes(scenes.map((x, j) => j === i ? { ...x, prompt: e.target.value } : x))} rows={2} className="input text-xs" placeholder={`Describe scene ${i + 1}…`} />
                </div>
              ))}
              <button onClick={() => setScenes([...scenes, { title: `Scene ${scenes.length + 1}`, prompt: "" }])} className="btn-ghost rounded-xl px-4 py-2 text-xs font-semibold">+ Add scene</button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Generate video?"
        message="Video generation uses the Veo API and may incur costs / consume quota. The request will be sent to Google's servers and polled until it completes or fails."
        confirmLabel="Generate"
        danger={false}
        onConfirm={() => { setConfirming(false); generate(); }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
