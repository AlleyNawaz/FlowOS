import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowUp,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Command,
  File,
  FileCode2,
  FileText,
  Folder,
  FolderSearch,
  Image,
  LayoutGrid,
  LoaderCircle,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { classifyIntent, DEFAULT_PREFERENCES, extractSearchTerms, isTauriRuntime, openFile, revealFile, searchFiles } from "./lib/flow";
import type { HistoryItem, Preferences, SearchResult, View } from "./lib/types";

const suggestions = [
  { icon: FolderSearch, label: "Find a file", prompt: "Find my latest project brief", color: "blue" },
  { icon: Clock3, label: "Recent work", prompt: "Find recent project files", color: "violet" },
  { icon: FileCode2, label: "Project files", prompt: "Find FlowOS project files", color: "amber" },
  { icon: Image, label: "Images", prompt: "Find Desktop images", color: "green" },
] as const;

const nav: { view: View; label: string; icon: typeof Search }[] = [
  { view: "home", label: "Command center", icon: LayoutGrid },
  { view: "search", label: "Search", icon: Search },
  { view: "recents", label: "Recents", icon: Clock3 },
];

const HISTORY_STORAGE_KEY = "flowos.history.v1";

function App() {
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchMeta, setSearchMeta] = useState({ scanned: 0, elapsedMs: 0, truncated: false });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(() => loadJson("flowos.preferences", DEFAULT_PREFERENCES));
  const [history, setHistory] = useState<HistoryItem[]>(() => loadJson(HISTORY_STORAGE_KEY, []));
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRequest = useRef(0);

  const runtime = isTauriRuntime();
  const intent = useMemo(() => classifyIntent(submittedQuery), [submittedQuery]);

  useEffect(() => localStorage.setItem("flowos.preferences", JSON.stringify(preferences)), [preferences]);
  useEffect(() => localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history)), [history]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        setTimeout(() => inputRef.current?.focus(), 20);
      }
      if (event.key === "Escape") setPaletteOpen(false);
      if (results.length && event.key === "ArrowDown") setSelected((value) => Math.min(value + 1, results.length - 1));
      if (results.length && event.key === "ArrowUp") setSelected((value) => Math.max(value - 1, 0));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [results.length]);

  async function runCommand(value = query) {
    const clean = value.trim();
    if (!clean) return;
    setSubmittedQuery(clean);
    setQuery(clean);
    setPaletteOpen(false);
    setError("");
    setSelected(0);
    const requestId = ++searchRequest.current;
    const nextIntent = classifyIntent(clean);

    if (nextIntent === "search" || nextIntent === "summarize" || nextIntent === "ask") {
      setView(nextIntent === "search" ? "search" : "assistant");
      setLoading(true);
      try {
        const terms = extractSearchTerms(clean) || clean;
        const response = await searchFiles(terms, preferences);
        if (requestId !== searchRequest.current) return;
        setResults(response.results);
        setSearchMeta({ scanned: response.scanned, elapsedMs: response.elapsedMs, truncated: response.truncated });
        if (preferences.saveHistory) {
          setHistory((items) => [{ query: clean, resultCount: response.results.length, timestamp: Date.now() }, ...items.filter((item) => item.query !== clean)].slice(0, 24));
        }
      } catch (reason) {
        if (requestId !== searchRequest.current) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setResults([]);
      } finally {
        if (requestId === searchRequest.current) setLoading(false);
      }
    } else {
      setView("assistant");
      setResults([]);
    }
  }

  function chooseSuggestion(prompt: string) {
    setQuery(prompt);
    void runCommand(prompt);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={18} /></div>
          <div className="brand-name">FlowOS</div>
          <span className="version">alpha</span>
        </div>

        <button className="quick-open" onClick={() => { setPaletteOpen(true); setTimeout(() => inputRef.current?.focus(), 20); }}>
          <Search size={15} />
          <span>Quick open</span>
          <kbd>⌘ K</kbd>
        </button>

        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button key={item.view} className={`nav-item ${view === item.view ? "active" : ""}`} onClick={() => setView(item.view)}>
              <item.icon size={17} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="privacy-card">
          <div className="privacy-icon"><ShieldCheck size={16} /></div>
          <div><strong>Private by design</strong><span>Your files stay on this Mac.</span></div>
        </div>
        <button className={`nav-item settings-link ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
          <Settings size={17} /><span>Settings</span>
        </button>
        <div className="profile-row">
          <div className="avatar">AN</div>
          <div><strong>Personal workspace</strong><span>{runtime ? "Local mode" : "Preview mode"}</span></div>
          <MoreHorizontal size={16} />
        </div>
      </aside>

      <main className="main-stage">
        <div className="topbar">
          <div className="window-title">{viewLabel(view)}</div>
          <div className="status"><span className="status-dot" /> {runtime ? "Local engine ready" : "Browser preview"}</div>
        </div>

        {view === "home" && <Home query={query} setQuery={setQuery} runCommand={runCommand} chooseSuggestion={chooseSuggestion} history={history} onViewAll={() => setView("recents")} />}
        {view === "search" && <SearchView query={query} setQuery={setQuery} runCommand={runCommand} submittedQuery={submittedQuery} loading={loading} results={results} selected={selected} setSelected={setSelected} searchMeta={searchMeta} error={error} />}
        {view === "assistant" && <AssistantView query={query} setQuery={setQuery} runCommand={runCommand} submittedQuery={submittedQuery} intent={intent} loading={loading} results={results} />}
        {view === "recents" && <RecentsView history={history} onRun={(value) => { setQuery(value); void runCommand(value); }} clear={() => setHistory([])} />}
        {view === "settings" && <SettingsView preferences={preferences} setPreferences={setPreferences} runtime={runtime} />}
      </main>

      {paletteOpen && (
        <div className="palette-backdrop" onMouseDown={() => setPaletteOpen(false)}>
          <div className="palette" onMouseDown={(event) => event.stopPropagation()}>
            <div className="palette-input-row"><Search size={20} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void runCommand(); }} placeholder="Search or ask FlowOS…" autoFocus /><kbd>esc</kbd></div>
            <div className="palette-label">Try a command</div>
            {suggestions.map((item) => <button key={item.prompt} className="palette-option" onClick={() => chooseSuggestion(item.prompt)}><item.icon size={17} /><span>{item.prompt}</span><ChevronRight size={15} /></button>)}
            <div className="palette-footer"><span><ArrowUp size={12} /> <ArrowUp className="down-arrow" size={12} /> navigate</span><span>↵ select</span><span>⌘K close</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Home({ query, setQuery, runCommand, chooseSuggestion, history, onViewAll }: { query: string; setQuery: (value: string) => void; runCommand: (value?: string) => void; chooseSuggestion: (value: string) => void; history: HistoryItem[]; onViewAll: () => void }) {
  return (
    <div className="home-view page-enter">
      <section className="hero">
        <div className="eyebrow"><span /> YOUR DIGITAL COMMAND CENTER</div>
        <h1>What do you need<br /><em>to find?</em></h1>
        <p>Find local files quickly, without breaking your flow.</p>
        <div className="command-box">
          <div className="command-input"><Sparkles size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runCommand(); }} placeholder="Search files, ask a question, or run a command…" autoFocus /><button aria-label="Run command" onClick={() => runCommand()}><ArrowUp size={18} /></button></div>
          <div className="command-hint"><span><Command size={12} /> Press <kbd>Enter</kbd> to run</span><span>Everything runs privately on your device</span></div>
        </div>
        <div className="suggestion-grid">
          {suggestions.map((item) => (
            <button className="suggestion" key={item.label} onClick={() => chooseSuggestion(item.prompt)}>
              <span className={`suggestion-icon ${item.color}`}><item.icon size={18} /></span>
              <span><strong>{item.label}</strong><small>{item.prompt}</small></span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>
      <section className="activity-section">
        <div className="section-heading"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Recent activity</h2></div>{history.length > 0 && <button onClick={onViewAll}>View all <ChevronRight size={14} /></button>}</div>
        {history.length > 0 ? <div className="activity-list">
          {history.slice(0, 3).map((item) => <button className="activity-row activity-button" key={item.timestamp} onClick={() => runCommand(item.query)}><span className="file-icon"><Search size={17} /></span><span className="activity-copy"><strong>{item.query}</strong><small>Search · {item.resultCount} result{item.resultCount === 1 ? "" : "s"}</small></span><time>{formatTime(item.timestamp / 1000)}</time><ChevronRight size={15} /></button>)}
        </div> : <div className="activity-empty">Your completed local searches will appear here.</div>}
      </section>
    </div>
  );
}

function SearchView({ query, setQuery, runCommand, submittedQuery, loading, results, selected, setSelected, searchMeta, error }: { query: string; setQuery: (value: string) => void; runCommand: (value?: string) => void; submittedQuery: string; loading: boolean; results: SearchResult[]; selected: number; setSelected: (value: number) => void; searchMeta: { scanned: number; elapsedMs: number; truncated: boolean }; error: string }) {
  return (
    <div className="content-view page-enter">
      <header className="page-header"><span className="section-kicker">LOCAL SEARCH</span><h1>Find anything.</h1><p>Search Documents, Desktop, and Downloads without sending filenames anywhere.</p></header>
      <div className="wide-search"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runCommand(); }} placeholder="Try “find my latest project brief”" autoFocus /><button onClick={() => runCommand()}>{loading ? <LoaderCircle className="spin" size={17} /> : "Search"}</button></div>
      {error && <div className="error-banner">{error}</div>}
      {submittedQuery && !loading && !error && <div className="result-summary"><span>{results.length} results for <strong>“{extractSearchTerms(submittedQuery) || submittedQuery}”</strong></span><span>{searchMeta.scanned.toLocaleString()} files scanned in {searchMeta.elapsedMs}ms{searchMeta.truncated ? " · scan limit reached" : ""}</span></div>}
      <div className="results-list">
        {loading && <SearchSkeleton />}
        {!loading && results.map((result, index) => <ResultRow key={result.id} result={result} selected={selected === index} onSelect={() => setSelected(index)} />)}
        {!loading && submittedQuery && results.length === 0 && !error && <EmptyState icon={Search} title="No matching files" detail="Try fewer words or enable more search locations in Settings." />}
        {!submittedQuery && <EmptyState icon={FolderSearch} title="Search in natural language" detail="FlowOS matches file names and paths across your selected folders." />}
      </div>
    </div>
  );
}

function ResultRow({ result, selected, onSelect }: { result: SearchResult; selected: boolean; onSelect: () => void }) {
  const Icon = result.kind === "document" ? FileText : result.kind === "image" ? Image : result.kind === "folder" ? Folder : result.kind === "code" ? FileCode2 : result.kind === "archive" ? Archive : File;
  return <div className={`result-row ${selected ? "selected" : ""}`} onMouseEnter={onSelect} onDoubleClick={() => void openFile(result.path)}><span className={`result-icon ${result.kind}`}><Icon size={20} /></span><div className="result-copy"><strong>{result.name}</strong><span>{result.path}</span></div><div className="result-meta"><span>{formatSize(result.size)}</span><span>{formatTime(result.modified)}</span></div><div className="result-actions"><button onClick={() => void revealFile(result.path)}>Reveal</button><button className="primary-mini" onClick={() => void openFile(result.path)}>Open</button></div></div>;
}

function AssistantView({ query, setQuery, runCommand, submittedQuery, intent, loading, results }: { query: string; setQuery: (value: string) => void; runCommand: (value?: string) => void; submittedQuery: string; intent: ReturnType<typeof classifyIntent>; loading: boolean; results: SearchResult[] }) {
  const response = assistantResponse(intent, results, submittedQuery);
  return (
    <div className="assistant-view page-enter">
      <div className="conversation">
        {!submittedQuery ? <EmptyState icon={Bot} title="Ask with context" detail="FlowOS can find local context now. Summaries, creation, and approved actions arrive in the next milestone." /> : <>
          <div className="user-message">{submittedQuery}</div>
          <div className="assistant-message"><span className="assistant-avatar"><Sparkles size={16} /></span><div>{loading ? <span className="thinking"><i /><i /><i /></span> : response}</div></div>
        </>}
      </div>
      <div className="composer"><Sparkles size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runCommand(); }} placeholder="Ask FlowOS…" /><button onClick={() => runCommand()}><ArrowUp size={17} /></button></div>
      <div className="composer-note"><ShieldCheck size={12} /> Local context only · Actions require approval</div>
    </div>
  );
}

function RecentsView({ history, onRun, clear }: { history: HistoryItem[]; onRun: (value: string) => void; clear: () => void }) {
  return <div className="content-view page-enter"><header className="page-header row"><div><span className="section-kicker">YOUR ACTIVITY</span><h1>Recents</h1><p>Queries are stored only on this device.</p></div>{history.length > 0 && <button className="text-button" onClick={clear}><X size={14} /> Clear history</button>}</header><div className="history-list">{history.map((item) => <button key={item.timestamp} onClick={() => onRun(item.query)}><span className="file-icon"><Clock3 size={17} /></span><span><strong>{item.query}</strong><small>{item.resultCount} results · {new Date(item.timestamp).toLocaleString()}</small></span><ChevronRight size={16} /></button>)}{history.length === 0 && <EmptyState icon={Clock3} title="No recent searches" detail="Your local search history will appear here." />}</div></div>;
}

function SettingsView({ preferences, setPreferences, runtime }: { preferences: Preferences; setPreferences: (value: Preferences) => void; runtime: boolean }) {
  const rows: { key: keyof Preferences; title: string; detail: string }[] = [
    { key: "searchDocuments", title: "Documents", detail: "Include your Documents folder in local search" },
    { key: "searchDesktop", title: "Desktop", detail: "Include files and folders on your Desktop" },
    { key: "searchDownloads", title: "Downloads", detail: "Include recent downloads and installers" },
    { key: "includeHidden", title: "Hidden files", detail: "Include dotfiles and hidden folders in results" },
    { key: "saveHistory", title: "Local history", detail: "Remember searches on this device" },
  ];
  return <div className="content-view settings-view page-enter"><header className="page-header"><span className="section-kicker">PREFERENCES</span><h1>Settings</h1><p>Control exactly what FlowOS can see and remember.</p></header><section className="settings-card"><h3>Search locations</h3>{rows.slice(0, 3).map((row) => <ToggleRow key={row.key} row={row} checked={preferences[row.key]} onChange={() => setPreferences({ ...preferences, [row.key]: !preferences[row.key] })} />)}</section><section className="settings-card"><h3>Privacy</h3>{rows.slice(3).map((row) => <ToggleRow key={row.key} row={row} checked={preferences[row.key]} onChange={() => setPreferences({ ...preferences, [row.key]: !preferences[row.key] })} />)}</section><section className="settings-card about"><div className="brand-mark"><Sparkles size={18} /></div><div><strong>FlowOS 0.1.0</strong><span>{runtime ? "Native desktop runtime" : "Web preview · native file access unavailable"}</span></div><span className="ready-badge"><Check size={12} /> Alpha foundation</span></section></div>;
}

function ToggleRow({ row, checked, onChange }: { row: { title: string; detail: string }; checked: boolean; onChange: () => void }) {
  return <div className="setting-row"><div><strong>{row.title}</strong><span>{row.detail}</span></div><button role="switch" aria-checked={checked} className={`toggle ${checked ? "on" : ""}`} onClick={onChange}><span /></button></div>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Search; title: string; detail: string }) { return <div className="empty-state"><span><Icon size={23} /></span><strong>{title}</strong><p>{detail}</p></div>; }
function SearchSkeleton() { return <>{[1, 2, 3, 4].map((item) => <div className="result-row skeleton" key={item}><span /><div><i /><i /></div></div>)}</>; }

function assistantResponse(intent: ReturnType<typeof classifyIntent>, results: SearchResult[], query: string) {
  if (intent === "summarize" && results.length) return <><p>I found {results.length} possible source{results.length === 1 ? "" : "s"} on this device.</p><div className="source-stack">{results.slice(0, 3).map((result) => <button key={result.id} onClick={() => void openFile(result.path)}><FileText size={15} /><span>{result.name}</span><ChevronRight size={14} /></button>)}</div><p className="muted-copy">Document text extraction is scheduled for Milestone 2. For now, you can open the source directly.</p></>;
  if (["organize", "schedule", "create"].includes(intent)) return <><p>I understand this as a <strong>{intent}</strong> request.</p><div className="plan-card"><span>01</span><p>Inspect the relevant context</p><span>02</span><p>Prepare a preview of the changes</p><span>03</span><p>Ask you before anything is changed</p></div><p className="muted-copy">This action is mapped, but its connector is not enabled in this alpha build.</p></>;
  if (results.length) return <><p>I searched your local folders and found {results.length} likely match{results.length === 1 ? "" : "es"} for “{extractSearchTerms(query) || query}”.</p><div className="source-stack">{results.slice(0, 3).map((result) => <button key={result.id} onClick={() => void openFile(result.path)}><FileText size={15} /><span>{result.name}</span><ChevronRight size={14} /></button>)}</div></>;
  return <p>I can search local files in this alpha build. Try asking me to find a document, project, image, or download.</p>;
}

function viewLabel(view: View) { return view === "assistant" ? "Command response" : nav.find((item) => item.view === view)?.label ?? "Settings"; }
function formatSize(bytes: number) { if (!bytes) return "—"; if (bytes < 1024) return `${bytes} B`; if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`; return `${(bytes / 1_048_576).toFixed(1)} MB`; }
function formatTime(seconds: number) { const date = new Date(seconds * 1000); const delta = Date.now() - date.getTime(); if (delta < 3_600_000) return `${Math.max(1, Math.round(delta / 60_000))}m ago`; if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h ago`; return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function loadJson<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }

export default App;
