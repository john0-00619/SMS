import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { listProjects } from "../lib/store";

export default function ProjectPicker({ value, onChange, allowNone = true }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (user) listProjects(user.uid).then(setProjects).catch(() => {});
  }, [user]);

  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value || null)} className="input text-sm">
      {allowNone && <option value="">No project</option>}
      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}
