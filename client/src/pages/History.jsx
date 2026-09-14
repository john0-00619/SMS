import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { listGenerations, deleteGeneration } from "../lib/store";
import { apiFetch, apiUrl, friendlyError } from "../lib/api";
import { SectionTitle, Spinner, EmptyState, StatusBadge, ConfirmDialog, Markdown } from "../components/ui";
import { fmtDate, downloadText } from "../lib/utils";

const TYPE_LINK = { script: "/scripts", image: "/images", video: "/videos", voice: "/voice", thumbnail: "/thumbnails", youtube: "/youtube" };

export default function History() {
  const { user } = useAuth();
  const toast = useToast();
  const [gens, setGens] = useState(null);
  const [filter, setFilter] = useState("all");
  const [del, setDel] = useState(null);
  const [open, setOpen] = useState(null);
  const [refreshing, setRefreshing] = useState(null);

  const load = () => listGenerations(user.uid, 150).then(setGens).catch(() => setGens([]));
  useEffect(() => { if (user) load(); }, [user]);

  const doDelete = async () => {
    try { await deleteGeneration(del); await load(); toast.success("Deleted"); }
    catch (e) { toast.error(friendlyError(e)); }
    finally { setDel(null); }
  };

  const recheckVideo = async (g) => {
    if (!g.operationName) return;
    setRefreshing(g.id);
    try {
      const s = await apiFetch(`/api/videos/status?name=${encodeURIComponent(g.operationName)}`);
      toast.info(`Operation status: ${s.status}`);
      await load();
      if (open?.id === g.id) setOpen({ ...g, status: s.status });
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setRefreshing(null); }
  };

  const filtered = (gens || []).filter((g) => filter === "all" || g.type === filter);

  return (
    <div>
      <SectionTitle title="Generation History" sub="Every generation: type, prompt, model, status, project and errors." />
      <div className="flex flex-wrap gap-1.5 mb-4">
        {["all", "script", "image", "video", "voice", "thumbnail", "youtube"].map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`rounded-lg px-3 py-2 text-xs font-bold border capitalize ${filter === t ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/5 text-zinc-400"}`}>{t}</button>
        ))}
      </div>

      {gens === null ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon="↺" title="No generations yet" hint="Your scripts, images, videos, voiceovers and optimizations will be recorded here." />
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => (
            <div key={g.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3 fade-up">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-white/5 rounded-md px-2 py-1 shrink-0">{g.type}</span>
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setOpen(g)}>
                <div className="text-sm text-zinc-100 truncate hover:text-amber-200">{g.title || g.prompt}</div>
                <div className="text-[11px] text-zinc-500 truncate">{g.model || "—"} · {fmtDate(g.createdAt)}{g.error ? ` · ⚠️ ${g.error.slice(0, 80)}` : ""}</div>
              </div>
              <StatusBadge status={g.status} />
              <div className="hidden sm:flex gap-1.5">
                {g.type === "video" && g.operationName && g.status !== "completed" && (
                  <button onClick={() => recheckVideo(g)} disabled={refreshing === g.id} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px] font-semibold">{refreshing === g.id ? "…" : "↻ Status"}</button>
                )}
                {g.type === "video" && g.status === "completed" && g.operationName && (
                  <a href={apiUrl(`/api/videos/download?name=${encodeURIComponent(g.operationName)}`)} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px] font-semibold">⬇</a>
                )}
                {g.outputText && (
                  <button onClick={() => { downloadText(g.outputText, `kobina-${g.type}-${g.id}.md`); toast.success("Downloaded"); }} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px] font-semibold">⬇</button>
                )}
                {g.previewDataUrl && (
                  <a href={g.previewDataUrl} download={`kobina-${g.type}-${g.id}.png`} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px] font-semibold">⬇</a>
                )}
                <Link to={TYPE_LINK[g.type] || "/"} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px] font-semibold">↻ New</Link>
                <button onClick={() => setDel(g.id)} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px]">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!del} title="Delete record?" message="This removes the history entry (stored media in the library is kept)." onConfirm={doDelete} onCancel={() => setDel(null)} />

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80" onClick={() => setOpen(null)}>
          <div className="glass-deep rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-white/5 rounded-md px-2 py-1">{open.type}</span>
              <StatusBadge status={open.status} />
              <button onClick={() => setOpen(null)} className="ml-auto btn-ghost rounded-lg px-3 py-1 text-xs">✕</button>
            </div>
            <h3 className="font-display font-bold text-white">{open.title || "Generation"}</h3>
            <p className="text-xs text-zinc-500 mt-1">{open.model} · {fmtDate(open.createdAt)}</p>
            <div className="mt-4 text-sm text-zinc-300 whitespace-pre-wrap">{open.prompt}</div>
            {open.previewDataUrl && <img src={open.previewDataUrl} alt="" className="rounded-xl mt-4 w-full border border-white/10" />}
            {open.outputText && <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 max-h-[40vh] overflow-y-auto scrollbar-thin"><Markdown text={open.outputText} /></div>}
            {open.error && <p className="mt-3 text-sm text-rose-300">⚠️ {open.error}</p>}
            {open.type === "video" && open.operationName && (
              <div className="mt-4 flex gap-2">
                {open.status === "completed" ? (
                  <a href={apiUrl(`/api/videos/download?name=${encodeURIComponent(open.operationName)}`)} className="btn-primary rounded-xl px-4 py-2 text-xs">⬇ Download video</a>
                ) : (
                  <button onClick={() => recheckVideo(open)} className="btn-ghost rounded-xl px-4 py-2 text-xs font-semibold">↻ Recheck live status</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
