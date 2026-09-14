import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { apiFetch, friendlyError } from "../lib/api";
import { saveGeneration } from "../lib/store";
import { SectionTitle, Spinner, ErrorBanner, EmptyState, CopyButton, Markdown } from "../components/ui";
import { copyText } from "../lib/utils";

const TABS = [
  { id: "full", label: "Full Package" },
  { id: "titles", label: "Titles" },
  { id: "description", label: "Description" },
  { id: "shorts", label: "Shorts" },
  { id: "chapters", label: "Chapters" },
  { id: "tags", label: "Tags" },
];

export default function YouTubeStudio() {
  const { user } = useAuth();
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState("full");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!topic.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const r = await apiFetch("/api/scripts/youtube", { method: "POST", body: { topic, kind } });
      setResult(r.text);
      await saveGeneration(user.uid, {
        type: "youtube", prompt: topic.slice(0, 500), model: r.model, status: "completed",
        outputText: r.text.slice(0, 20000), title: `YouTube ${kind} — ${topic.slice(0, 50)}`,
      }).catch(() => {});
      toast.success("Optimization generated");
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  };

  // Split full result into copyable sections
  const sections = result.split(/^## /m).filter(Boolean).map((s) => {
    const [head, ...rest] = s.split("\n");
    return { head: head.trim(), body: rest.join("\n").trim() };
  });

  return (
    <div>
      <SectionTitle title="YouTube Studio" sub="Titles, descriptions, chapters, tags, Shorts captions and SEO — copy each block individually." />
      <ErrorBanner message={error} onRetry={generate} />
      <div className="glass rounded-2xl p-5 space-y-3 mt-4">
        <div><label className="lbl">Video topic or completed script *</label><textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={4} className="input mt-1 text-sm" placeholder="Paste your topic, hook, or full script…" /></div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setKind(t.id)} className={`rounded-lg px-3 py-2 text-xs font-bold border ${kind === t.id ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/5 text-zinc-400"}`}>{t.label}</button>
          ))}
        </div>
        <button onClick={generate} disabled={busy || !topic.trim()} className="btn-primary rounded-xl px-6 py-3 text-sm flex items-center gap-2">
          {busy ? <><Spinner size={16} /> Optimizing…</> : "◎ Generate Optimization"}
        </button>
      </div>

      <div className="mt-4">
        {!result ? (
          <div className="glass rounded-2xl p-5"><EmptyState icon="◎" title="No optimization yet" hint="Enter a topic and generate your YouTube growth package." /></div>
        ) : kind === "full" && sections.length > 1 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {sections.map((s, i) => (
              <div key={i} className="glass rounded-2xl p-5 fade-up">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-amber-200 text-sm">{s.head}</h3>
                  <button onClick={async () => { await copyText(`${s.head}\n\n${s.body}`); toast.success(`Copied: ${s.head}`); }} className="btn-ghost rounded-lg px-2.5 py-1 text-[11px] font-semibold">⧉ Copy</button>
                </div>
                <Markdown text={s.body} />
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-5 sm:p-6 fade-up">
            <div className="flex justify-end mb-3"><CopyButton text={result} label="Copy all" /></div>
            <Markdown text={result} />
          </div>
        )}
      </div>
    </div>
  );
}
