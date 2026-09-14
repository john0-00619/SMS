import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { apiFetch, streamChat, friendlyError } from "../lib/api";
import { createConversation, listConversations, updateConversation, deleteConversation } from "../lib/store";
import { Markdown, Spinner, EmptyState, CopyButton, ConfirmDialog, SectionTitle } from "../components/ui";
import { copyText } from "../lib/utils";

export default function AIChat() {
  const { user } = useAuth();
  const toast = useToast();
  const [convos, setConvos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [delId, setDelId] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const abortRef = useRef(null);
  const bottomRef = useRef(null);

  const active = convos.find((c) => c.id === activeId);

  useEffect(() => {
    if (user) listConversations(user.uid).then(setConvos).catch(() => {});
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const newChat = () => {
    setActiveId(null); setMessages([]); setShowHistory(false);
  };

  const openConvo = (c) => {
    setActiveId(c.id); setMessages(c.messages || []); setShowHistory(false);
  };

  const persist = async (id, msgs, title) => {
    const patch = { messages: msgs };
    if (title) patch.title = title;
    await updateConversation(id, patch);
    setConvos((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const send = async (override) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    setBusy(true); setInput("");
    let id = activeId;
    let msgs = [...messages, { role: "user", content: text }];
    setMessages(msgs);
    try {
      if (!id) {
        id = await createConversation(user.uid, text.slice(0, 50));
        setActiveId(id);
        setConvos((p) => [{ id, title: text.slice(0, 50), messages: msgs }, ...p]);
      } else {
        setConvos((p) => p.map((c) => (c.id === id ? { ...c, messages: msgs } : c)));
      }
      // Stream the real response
      setStreaming(true);
      setMessages([...msgs, { role: "model", content: "" }]);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      let full = "";
      try {
        full = await streamChat(msgs, {
          signal: ctrl.signal,
          onToken: (_t, acc) => setMessages([...msgs, { role: "model", content: acc }]),
        });
      } catch (e) {
        if (ctrl.signal.aborted) {
          full = full || "(stopped)";
        } else {
          // Fallback to non-streaming endpoint
          const r = await apiFetch("/api/chat", { method: "POST", body: { messages: msgs } });
          full = r.text;
          setMessages([...msgs, { role: "model", content: full }]);
        }
      }
      const final = [...msgs, { role: "model", content: full }];
      setMessages(final);
      await persist(id, final);
    } catch (e) {
      toast.error(friendlyError(e));
      setMessages(msgs);
    } finally {
      setBusy(false); setStreaming(false); abortRef.current = null;
    }
  };

  const regenerate = async () => {
    if (busy || messages.length === 0) return;
    const msgs = [...messages];
    if (msgs[msgs.length - 1]?.role === "model") msgs.pop();
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages(msgs);
    setBusy(true); setStreaming(true);
    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setMessages([...msgs, { role: "model", content: "" }]);
      let full = "";
      try {
        full = await streamChat(msgs, { signal: ctrl.signal, onToken: (_t, acc) => setMessages([...msgs, { role: "model", content: acc }]) });
      } catch (e) {
        if (!ctrl.signal.aborted) {
          const r = await apiFetch("/api/chat", { method: "POST", body: { messages: msgs } });
          full = r.text;
          setMessages([...msgs, { role: "model", content: full }]);
        } else full = full || "(stopped)";
      }
      const final = [...msgs, { role: "model", content: full }];
      setMessages(final);
      if (activeId) await persist(activeId, final);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false); setStreaming(false); abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const doDelete = async () => {
    try {
      await deleteConversation(delId);
      setConvos((p) => p.filter((c) => c.id !== delId));
      if (activeId === delId) { setActiveId(null); setMessages([]); }
      toast.success("Conversation deleted");
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setDelId(null); }
  };

  const doRename = async (id) => {
    const title = renameVal.trim() || "Untitled chat";
    try {
      await updateConversation(id, { title });
      setConvos((p) => p.map((c) => (c.id === id ? { ...c, title } : c)));
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setRenaming(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle title="AI Chat" sub="Multi-turn Gemini assistant with streaming." />
        <div className="flex gap-2 pb-4">
          <button onClick={() => setShowHistory(!showHistory)} className="btn-ghost rounded-xl px-3 py-2 text-xs font-semibold lg:hidden">☰ History</button>
          <button onClick={newChat} className="btn-primary rounded-xl px-4 py-2 text-xs">+ New chat</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        {/* History sidebar */}
        <div className={`glass rounded-2xl p-3 lg:block ${showHistory ? "block" : "hidden"} max-h-[50vh] lg:max-h-[70vh] overflow-y-auto scrollbar-thin`}>
          {convos.length === 0 ? (
            <p className="text-xs text-zinc-500 p-2">No conversations yet.</p>
          ) : convos.map((c) => (
            <div key={c.id} className={`group rounded-xl px-3 py-2.5 mb-1 cursor-pointer text-sm ${c.id === activeId ? "bg-amber-400/10 border border-amber-400/25 text-amber-100" : "hover:bg-white/5 text-zinc-300 border border-transparent"}`}>
              {renaming === c.id ? (
                <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
                  onBlur={() => doRename(c.id)} onKeyDown={(e) => e.key === "Enter" && doRename(c.id)}
                  className="input !py-1 !px-2 text-xs" />
              ) : (
                <div className="flex items-center gap-1">
                  <span className="truncate flex-1" onClick={() => openConvo(c)}>{c.title || "Untitled"}</span>
                  <button className="opacity-0 group-hover:opacity-100 text-[11px] px-1" title="Rename"
                    onClick={() => { setRenaming(c.id); setRenameVal(c.title || ""); }}>✎</button>
                  <button className="opacity-0 group-hover:opacity-100 text-[11px] px-1" title="Delete" onClick={() => setDelId(c.id)}>🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chat panel */}
        <div className="glass rounded-2xl flex flex-col min-h-[60vh] max-h-[75vh]">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
            {messages.length === 0 ? (
              <EmptyState icon="✦" title={active ? active.title : "Start a conversation"}
                hint="Ask for video ideas, hooks, captions, business plans, code — anything. Responses stream in real time." />
            ) : messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-400/25 text-white" : "bg-white/[0.04] border border-white/10"}`}>
                  {m.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  ) : m.content ? (
                    <><Markdown text={m.content} />
                      <div className="flex gap-2 mt-3">
                        <CopyButton text={m.content} />
                        {i === messages.length - 1 && <button onClick={regenerate} disabled={busy} className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold">↻ Regenerate</button>}
                      </div></>
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-zinc-400"><Spinner size={14} /> Thinking…</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 sm:p-4 border-t border-white/8">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Message Kobina AI… (Enter to send)"
                rows={2}
                className="input resize-none text-sm"
              />
              <div className="flex flex-col gap-2">
                {streaming ? (
                  <button onClick={stop} className="rounded-xl px-4 py-2 text-xs font-bold bg-rose-500 text-white h-full">■ Stop</button>
                ) : (
                  <button onClick={() => send()} disabled={busy || !input.trim()} className="btn-primary rounded-xl px-5 py-2 text-sm h-full flex items-center">
                    {busy ? <Spinner size={16} /> : "Send ➤"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog open={!!delId} title="Delete conversation?" message="This permanently deletes this chat history." onConfirm={doDelete} onCancel={() => setDelId(null)} />
    </div>
  );
}
