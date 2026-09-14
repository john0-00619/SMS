import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { listProjects, createProject, updateProject, deleteProject } from "../lib/store";
import { SectionTitle, Spinner, EmptyState, ConfirmDialog } from "../components/ui";
import { timeAgo } from "../lib/utils";
import { friendlyError } from "../lib/api";

export default function Projects() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [del, setDel] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");

  const load = () => listProjects(user.uid).then(setProjects).catch(() => setProjects([]));
  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      await createProject(user.uid, { name: name.trim() });
      setName("");
      await load();
      toast.success("Project created");
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setCreating(false); }
  };

  const duplicate = async (p) => {
    try {
      await createProject(user.uid, { name: `${p.name} (copy)`, description: p.description || "" });
      await load();
      toast.success("Project duplicated");
    } catch (e) { toast.error(friendlyError(e)); }
  };

  const doRename = async () => {
    try {
      await updateProject(renaming, { name: renameVal.trim() || "Untitled" });
      await load();
      toast.success("Renamed");
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setRenaming(null); }
  };

  const doDelete = async () => {
    try {
      await deleteProject(del);
      await load();
      toast.success("Project deleted");
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setDel(null); }
  };

  const filtered = (projects || []).filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <SectionTitle title="Projects" sub="Workspaces for scripts, images, videos, voiceovers and thumbnails." />
      <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="New project name…" className="input text-sm flex-1" />
        <button onClick={create} disabled={creating || !name.trim()} className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center justify-center gap-2">{creating ? <Spinner size={14} /> : "+ Create project"}</button>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search…" className="input text-sm sm:max-w-[220px]" />
      </div>

      {projects === null ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon="▤" title={search ? "No matching projects" : "Create your first project"} hint="Projects group everything for one video, series or campaign." />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-5 hover:border-amber-400/30 transition-all group fade-up">
              <Link to={`/projects/${p.id}`}>
                <h3 className="font-display font-bold text-white truncate hover:text-amber-200">{p.name}</h3>
                <p className="text-[11px] text-zinc-500 mt-1">Updated {timeAgo(p.updatedAt)}</p>
              </Link>
              {renaming === p.id ? (
                <div className="flex gap-2 mt-3">
                  <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} className="input !py-1.5 text-xs" />
                  <button onClick={doRename} className="btn-primary rounded-lg px-3 text-xs">Save</button>
                </div>
              ) : (
                <div className="flex gap-1.5 mt-4">
                  <Link to={`/projects/${p.id}`} className="btn-ghost rounded-lg px-3 py-1.5 text-[11px] font-semibold flex-1 text-center">Open →</Link>
                  <button onClick={() => { setRenaming(p.id); setRenameVal(p.name); }} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px]">✎</button>
                  <button onClick={() => duplicate(p)} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px]" title="Duplicate">⧉</button>
                  <button onClick={() => setDel(p.id)} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[11px]" title="Delete">🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog open={!!del} title="Delete project?" message="This deletes the project workspace. Generations linked to it remain in History." onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  );
}
