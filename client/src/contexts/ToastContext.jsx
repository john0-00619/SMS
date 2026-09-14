import { createContext, useContext, useState, useCallback } from "react";

const Ctx = createContext(null);
let id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, kind = "info") => {
    const t = { id: ++id, message, kind };
    setToasts((p) => [...p, t]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== t.id)), 4200);
  }, []);
  const toast = {
    success: (m) => push(m, "success"),
    error: (m) => push(m, "error"),
    info: (m) => push(m, "info"),
  };
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-[92vw] sm:max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className={`glass-deep rounded-xl px-4 py-3 text-sm shadow-2xl border-l-4 fade-up ${
            t.kind === "success" ? "border-l-emerald-400" : t.kind === "error" ? "border-l-rose-400" : "border-l-amber-400"
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
