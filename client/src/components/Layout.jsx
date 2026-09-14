import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const NAV = [
  { to: "/", label: "Home", icon: "◈", end: true },
  { to: "/chat", label: "AI Chat", icon: "✦" },
  { to: "/scripts", label: "Script Studio", icon: "✎" },
  { to: "/images", label: "Image Studio", icon: "◐" },
  { to: "/videos", label: "Video Studio", icon: "▶" },
  { to: "/voice", label: "Voice Studio", icon: "♪" },
  { to: "/thumbnails", label: "Thumbnail Studio", icon: "▣" },
  { to: "/youtube", label: "YouTube Studio", icon: "◎" },
  { to: "/projects", label: "Projects", icon: "▤" },
  { to: "/media", label: "Media Library", icon: "▦" },
  { to: "/history", label: "History", icon: "↺" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = useNavigate();

  const doLogout = async () => { await logout(); nav("/login"); };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-800 text-xl font-bold shrink-0"
          style={{ background: "linear-gradient(135deg,#f0c56b,#b45f1d)", color: "#1a1206" }}>K</div>
        {(!collapsed) && (
          <div className="min-w-0">
            <div className="font-display font-bold text-white leading-none truncate">Kobina <span className="gold-text">AI Studio</span></div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mt-1">Create · Generate · Publish</div>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-1 scrollbar-thin">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive
                ? "bg-gradient-to-r from-amber-400/20 to-transparent text-amber-200 border border-amber-400/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"}`
            }
          >
            <span className="text-base w-5 text-center shrink-0">{n.icon}</span>
            {!collapsed && <span className="truncate">{n.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/8">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 pb-2 min-w-0">
            {user.photoURL ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full shrink-0" /> :
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">{(user.email || "U")[0].toUpperCase()}</div>}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{user.displayName || "Creator"}</div>
              <div className="text-[11px] text-zinc-500 truncate">{user.email}</div>
            </div>
          </div>
        )}
        <button onClick={doLogout} className="btn-ghost w-full rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300">
          {collapsed ? "⏻" : "⏻ Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen hero-glow">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex fixed left-0 top-0 bottom-0 z-40 glass-deep border-r border-white/8 transition-all ${collapsed ? "w-[76px]" : "w-[264px]"}`}>
        <div className="flex-1 min-h-0 w-full">{sidebar}</div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-[#1a1a22] border border-white/15 text-[10px] text-zinc-400 hover:text-white"
          aria-label="Toggle sidebar"
        >{collapsed ? "›" : "‹"}</button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed left-0 top-0 bottom-0 z-50 w-[280px] glass-deep border-r border-white/10 lg:hidden transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebar}
      </aside>

      {/* Main */}
      <div className={`transition-all ${collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]"}`}>
        <header className="sticky top-0 z-30 glass-deep border-b border-white/8 lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setMobileOpen(true)} className="btn-ghost rounded-lg w-9 h-9 text-lg" aria-label="Menu">☰</button>
            <div className="font-display font-bold text-white">Kobina <span className="gold-text">AI Studio</span></div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
