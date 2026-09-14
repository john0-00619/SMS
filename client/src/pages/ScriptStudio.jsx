import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { apiFetch, friendlyError } from "../lib/api";
import { saveGeneration } from "../lib/store";
import { SectionTitle, Spinner, ErrorBanner, CopyButton, Markdown, EmptyState } from "../components/ui";
import ProjectPicker from "../components/ProjectPicker";
import { downloadText, copyText } from "../lib/utils";

const PLATFORMS = ["YouTube Long Form", "YouTube Shorts", "TikTok", "Instagram Reels", "Facebook Reels", "Podcast"];

export default function ScriptStudio() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    topic: "", platform: "YouTube Long Form", duration: "5-8 minutes",
    tone: "Engaging", audience: "General audience", language: "English",
    style: "Cinematic", goal: "Entertain and grow subscribers",
  });
  const [projectId, setProjectId] = useState(null);
  const [result, setResult] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const generate = async () => {
    if (!form.topic.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const r = await apiFetch("/api/scripts/generate", { method: "POST", body: form });
      setResult(r.text);
      setEditing(false);
      await saveGeneration(user.uid, {
        type: "script", prompt: form.topic, model: r.model,
        status: "completed", projectId: projectId || null,
        outputText: r.text.slice(0, 20000), title: form.topic.slice(0, 80),
      }).catch(() => {});
      toast.success("Script generated");
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  };

  const save = async () => {
    try {
      await saveGeneration(user.uid, {
        type: "script", prompt: form.topic || "(edited)", model: "edited",
        status: "completed", projectId: projectId || null,
        outputText: result.slice(0, 20000), title: (form.topic || "Script").slice(0, 80),
      });
      toast.success("Saved to history");
    } catch (e) { toast.error(friendlyError(e)); }
  };

  return (
    <div>
      <SectionTitle title="Script Studio" sub="Complete production-ready scripts: hook, scenes, VO, visuals, captions, titles & hashtags." />
      <ErrorBanner message={error} onRetry={generate} />
      <div className="grid lg:grid-cols-[340px_1fr] gap-4 mt-4">
        <div className="glass rounded-2xl p-5 space-y-3 h-fit">
          <div><label className="lbl">Topic *</label><textarea value={form.topic} onChange={set("topic")} rows={3} className="input mt-1 text-sm" placeholder="e.g. How I built a studio apartment cinema for under $200" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="lbl">Platform</label><select value={form.platform} onChange={set("platform")} className="input mt-1 text-sm">{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div><label className="lbl">Duration</label><input value={form.duration} onChange={set("duration")} className="input mt-1 text-sm" /></div>
            <div><label className="lbl">Tone</label><input value={form.tone} onChange={set("tone")} className="input mt-1 text-sm" /></div>
            <div><label className="lbl">Language</label><input value={form.language} onChange={set("language")} className="input mt-1 text-sm" /></div>
          </div>
          <div><label className="lbl">Audience</label><input value={form.audience} onChange={set("audience")} className="input mt-1 text-sm" /></div>
          <div><label className="lbl">Style</label><input value={form.style} onChange={set("style")} className="input mt-1 text-sm" /></div>
          <div><label className="lbl">Goal</label><input value={form.goal} onChange={set("goal")} className="input mt-1 text-sm" /></div>
          <div><label className="lbl">Project</label><div className="mt-1"><ProjectPicker value={projectId} onChange={setProjectId} /></div></div>
          <button onClick={generate} disabled={busy || !form.topic.trim()} className="btn-primary w-full rounded-xl px-4 py-3 text-sm flex items-center justify-center gap-2">
            {busy ? <><Spinner size={16} /> Generating…</> : "✦ Generate Script"}
          </button>
        </div>

        <div className="glass rounded-2xl p-5 sm:p-6 min-h-[400px]">
          {!result ? (
            <EmptyState icon="✎" title="No script yet" hint="Fill in the topic and options, then generate a full production package." />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <CopyButton text={result} label="Copy all" />
                <button onClick={() => setEditing(!editing)} className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold">{editing ? "👁 Preview" : "✎ Edit"}</button>
                <button onClick={generate} disabled={busy} className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold">↻ Regenerate</button>
                <button onClick={save} className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold">💾 Save</button>
                <button onClick={() => { downloadText(result, `kobina-script-${Date.now()}.md`); toast.success("Exported"); }} className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold">⬇ Export .md</button>
              </div>
              {editing ? (
                <textarea value={result} onChange={(e) => setResult(e.target.value)} rows={28} className="input text-sm font-mono scrollbar-thin" />
              ) : (
                <Markdown text={result} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
