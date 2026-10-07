"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUp,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  History,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Sparkles,
  X,
  PanelLeftClose,
  Cloud,
  GitBranch,
  Square,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import GeneratedDashboard from "../generated/Dashboard";
import {
  api,
  getSessionId,
  type Session,
  type ChatMessage,
} from "../lib/types";

export function Shell() {
  const [session, setSession] = useState<Session>(),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [prompt, setPrompt] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false),
    [showChat, setShowChat] = useState(true),
    [history, setHistory] = useState<any[] | null>(null),
    [mobileNav, setMobileNav] = useState(false);
  const [recent, setRecent] = useState<Session[]>([]);
  const [sourceInfo, setSourceInfo] = useState<"aws" | "add" | null>(null);
  const sourceDialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null),
    bottom = useRef<HTMLDivElement>(null),
    chatScroll = useRef<HTMLDivElement>(null),
    cancel = useRef<AbortController | null>(null);
  const refresh = () =>
    api<Session>(`/api/sessions/${getSessionId()}`).then(setSession);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    api(`/api/sessions/${getSessionId()}/messages`)
      .then(setMessages)
      .catch((e) => setError(e.message));
    const listener = (e: Event) => {
      setPrompt((e as CustomEvent).detail);
      input.current?.focus();
    };
    window.addEventListener("suggest-prompt", listener);
    return () => window.removeEventListener("suggest-prompt", listener);
  }, []);
  useEffect(() => {
    const el = chatScroll.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, status]);
  useEffect(() => {
    if (!session?.canEdit) { setRecent([]); return; }
    let alive = true;
    api<Session[]>("/api/sessions").then(items => { if (alive) setRecent(items.slice(0, 6)); }).catch(() => {});
    return () => { alive = false; };
  }, [session?.canEdit, session?.revision]);
  useEffect(() => {
    if (sourceInfo) sourceDialog.current?.showModal();
    else sourceDialog.current?.close();
  }, [sourceInfo]);
  async function logout() {
    try { await api("/api/auth/logout", {}); window.location.href = "/"; }
    catch (e) { setError((e as Error).message); }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || busy || !session?.canEdit) return;
    const text = prompt.trim();
    setPrompt("");
    setError("");
    setBusy(true);
    setShowChat(true);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setStatus("Thinking…");
    const controller = new AbortController();
    cancel.current = controller;
    let assistant = "";
    try {
      const response = await fetch(`/api/sessions/${getSessionId()}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error((await response.json()).error);
      if (!response.body) throw new Error("No response stream.");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        let split: number;
        while ((split = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const event = JSON.parse(line.slice(6));
          if (event.type === "status") setStatus(event.message);
          if (event.type === "delta") {
            assistant += event.text;
            setMessages((m) =>
              m.at(-1)?.role === "assistant"
                ? [...m.slice(0, -1), { role: "assistant", content: assistant }]
                : [...m, { role: "assistant", content: assistant }],
            );
          }
          if (event.type === "error") throw new Error(event.message);
          if (event.type === 'updated') {
            await refresh();
            window.dispatchEvent(new Event('dashboard-updated'));
          }
          if (event.type === "done") {
            await refresh();
          }
        }
        if (done) break;
      }
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "Request stopped. Any completed dashboard changes remain saved."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
      setStatus("");
      cancel.current = null;
      api(`/api/sessions/${getSessionId()}/messages`)
        .then(setMessages)
        .catch(() => {});
    }
  }
  async function share() {
    try {
      const result = session?.canEdit
        ? await api(`/api/sessions/${getSessionId()}/share`, {})
        : { url: window.location.href };
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function newSession() {
    try {
      const s = await api("/api/sessions", {});
      window.location.href = `/${s.id}`;
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function viewHistory() {
    try {
      setHistory(await api(`/api/sessions/${getSessionId()}/history`));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function rollback(revision: string) {
    setBusy(true);
    try {
      await api(`/api/sessions/${getSessionId()}/restore`, { revision });
      await refresh();
      setHistory(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="application">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <a href="/" className="brand">
          <span className="brand-mark">
            v<span>n</span>
          </span>
          <span>
            von neumann<small>YOUR DATA, IN CONVERSATION</small>
          </span>
        </a>
        <div className="sidebar-scroll">
        <nav className="nav-section" aria-label="Workspace">
          <span className="eyebrow">WORKSPACE</span>
          <a href="/">
            <LayoutDashboard size={16} />
            All dashboards
          </a>
          {session?.canEdit && (
            <button onClick={newSession}>
              <Plus size={16} />
              New dashboard
            </button>
          )}
        </nav>
        <nav className="nav-section recent-section" aria-label={session?.canEdit ? "Recent dashboards" : "Shared dashboard"}>
          <span className="eyebrow">{session?.canEdit ? "RECENT DASHBOARDS" : "SHARED DASHBOARD"}</span>
          <div className="recent-links">
            {(session?.canEdit ? recent : session ? [session] : []).map(item => (
              <a className="recent-link" key={item.id} href={`/${item.id}`} title={item.title} aria-label={item.title} aria-current={item.id === getSessionId() ? "page" : undefined}>{item.title}</a>
            ))}
            {session?.canEdit && !recent.length && <p className="recent-empty">Your recent dashboards will appear here.</p>}
          </div>
        </nav>
        </div>
        <div className="sidebar-bottom">
        <div className="connections">
          <span className="eyebrow">
            CONNECTED SOURCES <span>1</span>
          </span>
          <button type="button" className="connector source-button" aria-label="About Amazon Web Services source" onClick={() => setSourceInfo("aws")}>
            <span className="aws-icon">
              <Cloud size={18} />
            </span>
            <span className="source-copy">
              Amazon Web Services
              <small>
                {session?.mode === "demo"
                  ? "Demo connector"
                  : "Read-only connector"}
              </small>
            </span>
            <span className="dot" />
          </button>
          {session?.canEdit && <button type="button" className="add-source" onClick={() => setSourceInfo("add")}><Plus size={15} />Add source</button>}
        </div>
          {session?.canEdit ? <button type="button" className="logout-button" onClick={logout}><LogOut size={16} />Log out</button> : <a href="/" className="logout-button"><ArrowLeft size={16} />Back to sign in</a>}
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileNav(!mobileNav)}
            aria-label="Toggle navigation"
            aria-expanded={mobileNav}
          >
            <PanelLeftClose size={18} />
          </button>
          <div className="breadcrumbs">
            <span>Dashboards</span>
            <span>/</span>
            <strong>{session?.title || "Untitled dashboard"}</strong>
          </div>
          <div className="header-actions">
            <button className="subtle" onClick={viewHistory}>
              <History size={15} />
              <span>History</span>
            </button>
            {session?.canEdit && (
              <button className="secondary" onClick={share}>
                <span>{copied ? <Check size={14} /> : <Copy size={14} />}</span>
                {copied ? "Link copied" : "Share dashboard"}
              </button>
            )}
          </div>
        </header>
        <div className="workspace-panes">
        <div className="dashboard-content">
          <div className="dashboard-title">
            <div>
              <span className="eyebrow">YOUR LIVING DASHBOARD</span>
              <h1>
                {session?.title || "Untitled dashboard"}
                <span className="title-dot" />
              </h1>
              <p>
                {session?.dashboard.widgets.length
                  ? "Your data, shaped by the questions you ask."
                  : "Start with a question. Make it your own."}
              </p>
            </div>
            <span className="live-badge">
              <span className="dot" />
              {session?.mode === "demo" ? "Demo data" : "Live connection"}
            </span>
          </div>
          <GeneratedDashboard />
        </div>
        <aside className="chat-pane" aria-label="Dashboard assistant">
          {messages.length > 0 && (
            <section className="conversation">
              <button
                className="conversation-toggle"
                onClick={() => setShowChat(!showChat)}
              >
                <MessageSquare size={15} />
                Conversation<span>{messages.length}</span>
                <ChevronDown
                  size={15}
                  style={{ transform: showChat ? "rotate(180deg)" : "" }}
                />
              </button>
              {showChat && (
                <div className="messages" ref={chatScroll} aria-live="polite">
                  {messages.map((m, i) => (
                    <div className={`message ${m.role}`} key={i}>
                      <span className="message-avatar">
                        {m.role === "assistant" ? <Sparkles size={14} /> : "Y"}
                      </span>
                      <div>
                        <strong>
                          {m.role === "assistant" ? "Von Neumann" : "You"}
                        </strong>
                        <p>{m.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottom} />
                </div>
              )}
            </section>
          )}
        <div className="composer-area">
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={14} />
              </button>
            </div>
          )}
          {busy && (
            <div className="thinking">
              <span className="thinking-dot" />
              {status}
            </div>
          )}
          <form className="composer" onSubmit={send}>
            <span className="composer-spark">
              <Sparkles size={19} />
            </span>
            <textarea
              ref={input}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={
                session?.canEdit === false
                  ? "You’re viewing a shared dashboard"
                  : "Ask your data anything, or describe what to build…"
              }
              aria-label="Ask your data"
              disabled={busy || !session?.canEdit}
              rows={1}
            />
            {busy ? (
              <button
                type="button"
                className="send-button"
                onClick={() => cancel.current?.abort()}
                aria-label="Stop response"
              >
                <Square size={15} />
              </button>
            ) : (
              <button
                className="send-button"
                disabled={!prompt.trim() || !session?.canEdit}
                aria-label="Send prompt"
              >
                <ArrowUp size={19} />
              </button>
            )}
          </form>
          <div className="composer-footer">
            <span>
              <span className="dot" />
              {session?.provider === "demo"
                ? "Demo assistant"
                : session?.provider === "copilot"
                  ? "GitHub Copilot"
                  : session?.provider === "vertex"
                    ? "Vertex AI"
                    : session?.provider === "bedrock"
                      ? "Amazon Bedrock"
                    : "OpenAI"}
              <span className="footer-divider">·</span>
              {session?.canEdit
                ? "Changes are saved automatically"
                : "View-only access"}
            </span>
            <span>
              <GitBranch size={11} />
              {session?.revision?.slice(0, 7) || "main"}
              <span className="footer-divider">·</span>
              {session?.syncStatus === "pending" ? (
                <button
                  onClick={() =>
                    api(`/api/sessions/${getSessionId()}/sync`, {})
                      .then(refresh)
                      .catch((e) => setError(e.message))
                  }
                >
                  Retry sync
                </button>
              ) : session?.syncStatus === "local" ? (
                "Saved locally"
              ) : (
                "Synced"
              )}
            </span>
          </div>
        </div>
        </aside>
        </div>
      </main>
      <dialog ref={sourceDialog} className="source-dialog" aria-labelledby="source-dialog-title" onClose={() => setSourceInfo(null)}>
        <span className="eyebrow">{sourceInfo === "add" ? "COMING LATER" : "CONNECTED SOURCES"}</span>
        <h2 id="source-dialog-title">{sourceInfo === "add" ? "Add a source" : "Amazon Web Services"}</h2>
        {sourceInfo === "add" ? <>
          <p>Adding sources from the interface is not available yet. This version supports one AWS connector, configured by the deployment operator on the server.</p>
          <p>Additional connector types need backend integration. Do not paste credentials into the chat.</p>
        </> : <>
          <p>{session?.mode === "demo" ? "Demo mode uses synthetic sample data. No live AWS account is queried." : "This workspace is connected to AWS through its server-side identity. Available resources depend on its configured scope."}</p>
          <p>The connector exposes approved, read-only operations for resource metadata, metrics and permitted logs. Access is enforced by the backend and configured AWS permissions. DynamoDB record access is separately restricted.</p>
          <p>Credentials are managed on the server, never in your dashboard. Sharing a widget can expose its bound data to the link holder.</p>
        </>}
        <form method="dialog"><button className="secondary">{sourceInfo === "add" ? "Got it" : "Close source details"}</button></form>
      </dialog>
      {history && (
        <div className="modal-backdrop" onClick={() => setHistory(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard history"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">
              <div>
                <span className="eyebrow">EVERY CHANGE, REMEMBERED</span>
                <h2>Dashboard history</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close history"
                onClick={() => setHistory(null)}
              >
                <X size={18} />
              </button>
            </div>
            {history.map((entry) => (
              <div className="history-entry" key={entry.revision}>
                <GitBranch size={16} />
                <div>
                  <strong>{entry.title}</strong>
                  <small>
                    {new Date(entry.createdAt).toLocaleString()} ·{" "}
                    {entry.revision.slice(0, 7)}
                  </small>
                </div>
                {session?.canEdit && (
                  <button
                    className="secondary"
                    disabled={busy || entry.revision === session.revision}
                    onClick={() => rollback(entry.revision)}
                  >
                    {entry.revision === session.revision
                      ? "Current"
                      : "Restore"}
                  </button>
                )}
              </div>
            ))}
            {session?.canEdit && (
              <button
                className="subtle revoke"
                onClick={() =>
                  api(`/api/sessions/${getSessionId()}/share/revoke`, {})
                    .then(() => {
                      setHistory(null);
                      setStatus("Sharing links revoked.");
                    })
                    .catch((e) => setError(e.message))
                }
              >
                Revoke all sharing links
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
