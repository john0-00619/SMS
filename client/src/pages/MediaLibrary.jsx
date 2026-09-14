import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { listAssets, deleteAsset, saveAsset, uploadFile, deleteStoragePath } from "../lib/store";
import { SectionTitle, Spinner, EmptyState, ConfirmDialog } from "../components/ui";
import ProjectPicker from "../components/ProjectPicker";
import { validateUpload, timeAgo } from "../lib/utils";
import { friendlyError } from "../lib/api";

const FILTERS = [["all", "All"], ["image", "Images"], ["video", "Videos"], ["audio", "Audio"], ["upload", "Uploads"]];

export default function MediaLibrary() {
  const { user } = useAuth();
  const toast = useToast();
  const [assets, setAssets] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [projectId, setProjectId] = useState(null);
  const [del, setDel] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = () => listAssets(user.uid).then(setAssets).catch(() => setAssets([]));
  useEffect(() => { if (user) load(); }, [user]);

  const upload = async (f) => {
    const err = validateUpload(f, { maxMb: 50 });
    if (err) return toast.error(err);
    setUploading(true); setProgress(0);
    try {
      const up = await uploadFile(user.uid, f, { onProgress: setProgress });
      const kind = f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : "audio";
      await saveAsset(user.uid, {
        kind, upload: true, name: f.name, url: up.url, storagePath: up.path,
        mimeType: f.type, size: f.size, projectId: projectId || null,
      });
      await load();
      toast.success("Uploaded to library");
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setUploading(false); }
  };

  const doDelete = async () => {
    try {
      if (del.storagePath) await deleteStoragePath(del.storagePath);
      await deleteAsset(del.id);
      await load();
      toast.success("Deleted");
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setDel(null); }
  };

  const filtered = (assets || []).filter((a) => {
    if (filter === "upload" && !a.upload) return false;
    if (filter !== "all" && filter !== "upload" && a.kind !== filter) return false;
    return (a.name || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <SectionTitle title="Media Library" sub="Generated media and uploads — preview, download, organize by project." />
      <div className="glass rounded-2xl p-4 flex flex-col lg:flex-row gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={`rounded-lg px-3 py-2 text-xs font-bold border ${filter === id ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/5 text-zinc-400"}`}>{label}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search…" className="input text-sm lg:max-w-[200px]" />
        <div className="lg:ml-auto flex gap-2">
          <div className="w-[160px]"><ProjectPicker value={projectId} onChange={setProjectId} /></div>
          <label className="btn-primary rounded-xl px-4 py-2.5 text-xs font-bold cursor-pointer whitespace-nowrap flex items-center">
            {uploading ? `${progress}%` : "⬆ Upload"}
            <input type="file" accept="image/*,audio/*,video/*" className="hidden" disabled={uploading} onChange={(e) => { if (e.target.files[0]) upload(e.target.files[0]); e.target.value = ""; }} />
          </label>
          <button onClick={() => setView(view === "grid" ? "list" : "grid")} className="btn-ghost rounded-xl px-3 py-2 text-xs">{view === "grid" ? "☰" : "▦"}</button>
        </div>
      </div>
      {uploading && <div className="h-1.5 rounded-full bg-white/10 mb-4 overflow-hidden"><div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} /></div>}

      {assets === null ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon="▦" title={search || filter !== "all" ? "No matching media" : "No saved media"} hint="Save generations from any studio, or upload your own files." />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((a) => (
            <div key={a.id} className="glass rounded-xl overflow-hidden group fade-up">
              <div className="cursor-pointer" onClick={() => setPreview(a)}>
                {a.kind === "image" ? <img src={a.url} alt={a.name} className="w-full h-36 object-cover" loading="lazy" /> :
                  a.kind === "video" ? <video src={a.url} className="w-full h-36 object-cover bg-black" preload="metadata" /> :
                  <div className="h-36 flex items-center justify-center text-4xl bg-white/[0.03]">♪</div>}
              </div>
              <div className="p-2.5">
                <div className="text-xs text-zinc-200 truncate font-medium">{a.name}</div>
                <div className="text-[10px] text-zinc-500">{a.kind} · {timeAgo(a.createdAt)}</div>
                <div className="flex gap-1.5 mt-2">
                  <a href={a.url} download={a.name} target="_blank" rel="noreferrer" className="btn-ghost rounded-lg px-2.5 py-1 text-[11px] font-semibold flex-1 text-center">⬇ Download</a>
                  <button onClick={() => setDel(a)} className="btn-ghost rounded-lg px-2.5 py-1 text-[11px]">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">{a.kind === "image" ? "🖼️" : a.kind === "video" ? "🎬" : "🎵"}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-zinc-200 truncate">{a.name}</div>
                <div className="text-[11px] text-zinc-500">{a.kind} · {timeAgo(a.createdAt)}</div>
              </div>
              <button onClick={() => setPreview(a)} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px] font-semibold">Preview</button>
              <a href={a.url} download={a.name} target="_blank" rel="noreferrer" className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px] font-semibold">⬇</a>
              <button onClick={() => setDel(a)} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px]">🗑</button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!del} title="Delete asset?" message="This removes the library entry and its stored file." onConfirm={doDelete} onCancel={() => setDel(null)} />

      {preview && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/85" onClick={() => setPreview(null)}>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            {preview.kind === "image" ? <img src={preview.url} alt="" className="rounded-2xl w-full max-h-[80vh] object-contain" /> :
              preview.kind === "video" ? <video src={preview.url} controls autoPlay className="rounded-2xl w-full max-h-[80vh] bg-black" /> :
              <div className="glass-deep rounded-2xl p-8"><p className="text-white font-bold mb-4 truncate">{preview.name}</p><audio src={preview.url} controls autoPlay className="w-full" /></div>}
            <div className="flex gap-2 mt-3 justify-end">
              <a href={preview.url} download={preview.name} target="_blank" rel="noreferrer" className="btn-primary rounded-xl px-4 py-2 text-xs">⬇ Download</a>
              <button onClick={() => setPreview(null)} className="btn-ghost rounded-xl px-4 py-2 text-xs">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
