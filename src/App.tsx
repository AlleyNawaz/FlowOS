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
import {
  classifyIntent,
  DEFAULT_PREFERENCES,
  extractSearchTerms,
  isTauriRuntime,
  openFile,
  revealFile,
  searchFiles,
} from "./lib/flow";
import type { HistoryItem, Preferences, SearchResult, View } from "./lib/types";

const suggestions = [
  { icon: FolderSearch, label: "Find a file", detail: "Across this Mac", prompt: "Find my latest project brief", tone: "sky" },
  { icon: Clock3, label: "Recent work", detail: "Continue your flow", prompt: "Find recent project files", tone: "lilac" },
  { icon: FileCode2, label: "Project files", detail: "Jump into code", prompt: "Find FlowOS project files", tone: "peach" },
  { icon: Image, label: "Images", detail: "Browse visually", prompt: "Find Desktop images", tone: "mint" },
] as const;

const nav: { view: View; label: string; icon: typeof Search }[] = [
  { view: "home", label: "Home", icon: LayoutGrid },
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
  const [paletteSelected, setPaletteSelected] = useState(0);
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
        window.setTimeout(() => inputRef.current?.focus(), 40);
        return;
      }

      if (event.key === "Escape") {
        setPaletteOpen(false);
        return;
      }

      if (!results.length || paletteOpen) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((value) => Math.min(value + 1, results.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((value) => Math.max(value - 1, 0));
      }
      if (event.key === "Enter" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        const result = results[selected];
        if (result) void openFile(result.path);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, results, selected]);

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
          setHistory((items) => [
            { query: clean, resultCount: response.results.length, timestamp: Date.now() },
            ...items.filter((item) => item.query !== clean),
          ].slice(0, 24));
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

  function openPalette() {
    setPaletteSelected(0);
    setPaletteOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }

  function handlePaletteKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setPaletteSelected((value) => Math.min(value + 1, suggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setPaletteSelected((value) => Math.max(value - 1, 0));
      return;
    }
    if (event.metaKey && /^[1-4]$/.test(event.key)) {
      event.preventDefault();
      chooseSuggestion(suggestions[Number(event.key) - 1].prompt);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = query.trim() || suggestions[paletteSelected].prompt;
      void runCommand(command);
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient-light ambient-light-one" aria-hidden="true" />
      <div className="ambient-light ambient-light-two" aria-hidden="true" />

      <aside className="sidebar">
        <div className="brand-row">
          <BrandMark />
          <div className="brand-copy">
            <strong>FlowOS</strong>
            <span>Personal intelligence</span>
          </div>
          <span className="version">Alpha</span>
        </div>

        <button className="quick-open" onClick={openPalette}>
          <Search size={15} strokeWidth={2} />
          <span>Search or ask</span>
          <span className="shortcut"><kbd>⌘</kbd><kbd>K</kbd></span>
        </button>

        <span className="nav-label">Workspace</span>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.view}
              className={`nav-item ${view === item.view ? "active" : ""}`}
              onClick={() => setView(item.view)}
              aria-current={view === item.view ? "page" : undefined}
            >
              <item.icon size={17} strokeWidth={1.8} />
              <span>{item.label}</span>
              {view === item.view && <i className="active-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="privacy-card">
          <span className="privacy-icon"><ShieldCheck size={16} strokeWidth={1.8} /></span>
          <div>
            <strong>Private on this Mac</strong>
            <span>Your files never leave your device.</span>
          </div>
        </div>

        <button className={`nav-item settings-link ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
          <Settings size={17} strokeWidth={1.8} />
          <span>Settings</span>
          {view === "settings" && <i className="active-indicator" />}
        </button>

        <div className="profile-row">
          <div className="avatar">AN</div>
          <div className="profile-copy">
            <strong>Personal workspace</strong>
            <span>{runtime ? "On-device" : "Web preview"}</span>
          </div>
          <MoreHorizontal size={16} />
        </div>
      </aside>

      <main className="main-stage">
        <header className="topbar">
          <div className="breadcrumbs"><span>FlowOS</span><ChevronRight size={12} /><strong>{viewLabel(view)}</strong></div>
          <div className="engine-status"><span className="status-dot" />{runtime ? "Local engine ready" : "Preview mode"}</div>
        </header>

        {view === "home" && (
          <Home
            query={query}
            setQuery={setQuery}
            runCommand={runCommand}
            chooseSuggestion={chooseSuggestion}
            history={history}
            onViewAll={() => setView("recents")}
          />
        )}
        {view === "search" && (
          <SearchView
            query={query}
            setQuery={setQuery}
            runCommand={runCommand}
            submittedQuery={submittedQuery}
            loading={loading}
            results={results}
            selected={selected}
            setSelected={setSelected}
            searchMeta={searchMeta}
            error={error}
          />
        )}
        {view === "assistant" && (
          <AssistantView
            query={query}
            setQuery={setQuery}
            runCommand={runCommand}
            submittedQuery={submittedQuery}
            intent={intent}
            loading={loading}
            results={results}
          />
        )}
        {view === "recents" && (
          <RecentsView history={history} onRun={(value) => { setQuery(value); void runCommand(value); }} clear={() => setHistory([])} />
        )}
        {view === "settings" && <SettingsView preferences={preferences} setPreferences={setPreferences} runtime={runtime} />}
      </main>

      {paletteOpen && (
        <div className="palette-backdrop" onMouseDown={() => setPaletteOpen(false)}>
          <section className="palette" role="dialog" aria-modal="true" aria-label="Quick command" onMouseDown={(event) => event.stopPropagation()}>
            <div className="palette-input-row">
              <Search size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handlePaletteKeyDown}
                placeholder="Search this Mac or ask FlowOS"
                autoFocus
              />
              <kbd>esc</kbd>
            </div>
            <div className="palette-label">Suggested</div>
            <div className="palette-options">
              {suggestions.map((item, index) => (
                <button key={item.prompt} className={`palette-option ${paletteSelected === index ? "selected" : ""}`} onMouseEnter={() => setPaletteSelected(index)} onClick={() => chooseSuggestion(item.prompt)}>
                  <span className={`palette-option-icon ${item.tone}`}><item.icon size={17} /></span>
                  <span><strong>{item.label}</strong><small>{item.prompt}</small></span>
                  <kbd>⌘{index + 1}</kbd>
                </button>
              ))}
            </div>
            <div className="palette-footer"><span>↑↓ Navigate</span><span>↵ Open</span><span>esc Close</span></div>
          </section>
        </div>
      )}
    </div>
  );
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /><b /></span>;
}

function Home({ query, setQuery, runCommand, chooseSuggestion, history, onViewAll }: {
  query: string;
  setQuery: (value: string) => void;
  runCommand: (value?: string) => void;
  chooseSuggestion: (value: string) => void;
  history: HistoryItem[];
  onViewAll: () => void;
}) {
  return (
    <div className="home-view page-enter">
      <section className="hero">
        <div className="hero-orb" aria-hidden="true"><BrandMark /></div>
        <span className="eyebrow">Your calm space to get things done</span>
        <h1>Everything you need,<br /><em>one thought away.</em></h1>
        <p>Find files and move through your work without losing focus.</p>

        <div className="command-box">
          <div className="command-glow" aria-hidden="true" />
          <div className="command-input">
            <Sparkles size={20} strokeWidth={1.8} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") runCommand(); }}
              placeholder="What would you like to find?"
              autoFocus
            />
            <button aria-label="Run command" onClick={() => runCommand()}><ArrowUp size={18} /></button>
          </div>
          <div className="command-hint">
            <span><Command size={12} /> <kbd>Enter</kbd> to search</span>
            <span><ShieldCheck size={12} /> Private and on-device</span>
          </div>
        </div>

        <div className="suggestion-grid">
          {suggestions.map((item, index) => (
            <button className="suggestion" style={{ "--delay": `${index * 55}ms` } as React.CSSProperties} key={item.label} onClick={() => chooseSuggestion(item.prompt)}>
              <span className={`suggestion-icon ${item.tone}`}><item.icon size={18} strokeWidth={1.8} /></span>
              <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      </section>

      <section className="activity-section">
        <div className="section-heading">
          <div><span className="section-kicker">Continue</span><h2>Recent activity</h2></div>
          {history.length > 0 && <button onClick={onViewAll}>See all <ChevronRight size={14} /></button>}
        </div>
        <div className="activity-panel">
          {history.length > 0 ? history.slice(0, 3).map((item) => (
            <button className="activity-row" key={item.timestamp} onClick={() => runCommand(item.query)}>
              <span className="file-icon"><Search size={16} /></span>
              <span className="activity-copy"><strong>{item.query}</strong><small>{item.resultCount} result{item.resultCount === 1 ? "" : "s"}</small></span>
              <time>{formatTime(item.timestamp / 1000)}</time>
              <ChevronRight size={15} />
            </button>
          )) : (
            <div className="activity-empty">
              <span className="empty-symbol"><Clock3 size={18} /></span>
              <div><strong>A quiet start</strong><span>Your recent searches will appear here.</span></div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SearchView({ query, setQuery, runCommand, submittedQuery, loading, results, selected, setSelected, searchMeta, error }: {
  query: string;
  setQuery: (value: string) => void;
  runCommand: (value?: string) => void;
  submittedQuery: string;
  loading: boolean;
  results: SearchResult[];
  selected: number;
  setSelected: (value: number) => void;
  searchMeta: { scanned: number; elapsedMs: number; truncated: boolean };
  error: string;
}) {
  return (
    <div className="content-view page-enter">
      <header className="page-header"><span className="section-kicker">On this Mac</span><h1>Find anything.</h1><p>Search your files naturally. Your filenames and queries stay on your device.</p></header>
      <div className="wide-search">
        <Search size={20} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runCommand(); }} placeholder="Try “find my latest project brief”" autoFocus />
        <button onClick={() => runCommand()}>{loading ? <LoaderCircle className="spin" size={17} /> : "Search"}</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {submittedQuery && !loading && !error && (
        <div className="result-summary"><span><strong>{results.length}</strong> results for “{extractSearchTerms(submittedQuery) || submittedQuery}”</span><span>{searchMeta.scanned.toLocaleString()} files · {searchMeta.elapsedMs}ms{searchMeta.truncated ? " · limit reached" : ""}</span></div>
      )}
      <div className="results-list">
        {loading && <SearchSkeleton />}
        {!loading && results.map((result, index) => <ResultRow key={result.id} result={result} selected={selected === index} onSelect={() => setSelected(index)} />)}
        {!loading && submittedQuery && results.length === 0 && !error && <EmptyState icon={Search} title="No matching files" detail="Try fewer words or enable more search locations in Settings." />}
        {!submittedQuery && <EmptyState icon={FolderSearch} title="Search in your own words" detail="FlowOS matches file names and paths across the folders you choose." />}
      </div>
    </div>
  );
}

function ResultRow({ result, selected, onSelect }: { result: SearchResult; selected: boolean; onSelect: () => void }) {
  const Icon = result.kind === "document" ? FileText : result.kind === "image" ? Image : result.kind === "folder" ? Folder : result.kind === "code" ? FileCode2 : result.kind === "archive" ? Archive : File;
  return (
    <div className={`result-row ${selected ? "selected" : ""}`} onMouseEnter={onSelect} onDoubleClick={() => void openFile(result.path)}>
      <span className={`result-icon ${result.kind}`}><Icon size={20} /></span>
      <div className="result-copy"><strong>{result.name}</strong><span>{result.path}</span></div>
      <div className="result-meta"><span>{formatSize(result.size)}</span><span>{formatTime(result.modified)}</span></div>
      <div className="result-actions"><button onClick={() => void revealFile(result.path)}>Show in Finder</button><button className="primary-mini" onClick={() => void openFile(result.path)}>Open</button></div>
    </div>
  );
}

function AssistantView({ query, setQuery, runCommand, submittedQuery, intent, loading, results }: {
  query: string;
  setQuery: (value: string) => void;
  runCommand: (value?: string) => void;
  submittedQuery: string;
  intent: ReturnType<typeof classifyIntent>;
  loading: boolean;
  results: SearchResult[];
}) {
  const response = assistantResponse(intent, results, submittedQuery);
  return (
    <div className="assistant-view page-enter">
      <div className="conversation">
        {!submittedQuery ? <EmptyState icon={Bot} title="Ask with context" detail="FlowOS can find the local context you need while keeping it private." /> : <>
          <div className="user-message">{submittedQuery}</div>
          <div className="assistant-message"><span className="assistant-avatar"><Sparkles size={16} /></span><div>{loading ? <span className="thinking"><i /><i /><i /></span> : response}</div></div>
        </>}
      </div>
      <div className="composer"><Sparkles size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runCommand(); }} placeholder="Ask FlowOS" /><button onClick={() => runCommand()}><ArrowUp size={17} /></button></div>
      <div className="composer-note"><ShieldCheck size={12} /> Local context only · You approve every action</div>
    </div>
  );
}

function RecentsView({ history, onRun, clear }: { history: HistoryItem[]; onRun: (value: string) => void; clear: () => void }) {
  return (
    <div className="content-view page-enter">
      <header className="page-header row"><div><span className="section-kicker">On this device</span><h1>Recents</h1><p>Return to a search without starting over.</p></div>{history.length > 0 && <button className="text-button" onClick={clear}><X size={14} /> Clear history</button>}</header>
      <div className="history-list">
        {history.map((item) => <button key={item.timestamp} onClick={() => onRun(item.query)}><span className="file-icon"><Clock3 size={17} /></span><span><strong>{item.query}</strong><small>{item.resultCount} results · {new Date(item.timestamp).toLocaleString()}</small></span><ChevronRight size={16} /></button>)}
        {history.length === 0 && <EmptyState icon={Clock3} title="Nothing here yet" detail="Searches you choose to save will appear here." />}
      </div>
    </div>
  );
}

function SettingsView({ preferences, setPreferences, runtime }: { preferences: Preferences; setPreferences: (value: Preferences) => void; runtime: boolean }) {
  const rows: { key: keyof Preferences; title: string; detail: string }[] = [
    { key: "searchDocuments", title: "Documents", detail: "Include your Documents folder in local search" },
    { key: "searchDesktop", title: "Desktop", detail: "Include files and folders on your Desktop" },
    { key: "searchDownloads", title: "Downloads", detail: "Include recent downloads and installers" },
    { key: "includeHidden", title: "Hidden files", detail: "Include dotfiles and hidden folders in results" },
    { key: "saveHistory", title: "Local history", detail: "Remember searches on this device" },
  ];
  return (
    <div className="content-view settings-view page-enter">
      <header className="page-header"><span className="section-kicker">Your preferences</span><h1>Settings</h1><p>Choose exactly what FlowOS can see and remember.</p></header>
      <section className="settings-card"><h3>Search locations</h3>{rows.slice(0, 3).map((row) => <ToggleRow key={row.key} row={row} checked={preferences[row.key]} onChange={() => setPreferences({ ...preferences, [row.key]: !preferences[row.key] })} />)}</section>
      <section className="settings-card"><h3>Privacy</h3>{rows.slice(3).map((row) => <ToggleRow key={row.key} row={row} checked={preferences[row.key]} onChange={() => setPreferences({ ...preferences, [row.key]: !preferences[row.key] })} />)}</section>
      <section className="settings-card about"><BrandMark /><div><strong>FlowOS 0.1.0</strong><span>{runtime ? "Native desktop runtime" : "Web preview · native file access unavailable"}</span></div><span className="ready-badge"><Check size={12} /> Foundation ready</span></section>
    </div>
  );
}

function ToggleRow({ row, checked, onChange }: { row: { title: string; detail: string }; checked: boolean; onChange: () => void }) {
  return <div className="setting-row"><div><strong>{row.title}</strong><span>{row.detail}</span></div><button role="switch" aria-checked={checked} aria-label={`${row.title}: ${checked ? "on" : "off"}`} className={`toggle ${checked ? "on" : ""}`} onClick={onChange}><span /></button></div>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Search; title: string; detail: string }) {
  return <div className="empty-state"><span><Icon size={22} /></span><strong>{title}</strong><p>{detail}</p></div>;
}

function SearchSkeleton() {
  return <>{[1, 2, 3, 4].map((item) => <div className="result-row skeleton" key={item}><span /><div><i /><i /></div></div>)}</>;
}

function assistantResponse(intent: ReturnType<typeof classifyIntent>, results: SearchResult[], query: string) {
  if (intent === "summarize" && results.length) return <><p>I found {results.length} possible source{results.length === 1 ? "" : "s"} on this device.</p><div className="source-stack">{results.slice(0, 3).map((result) => <button key={result.id} onClick={() => void openFile(result.path)}><FileText size={15} /><span>{result.name}</span><ChevronRight size={14} /></button>)}</div><p className="muted-copy">Open a source to review it. Document text extraction is not enabled in this build.</p></>;
  if (["organize", "schedule", "create"].includes(intent)) return <><p>I understand this as a <strong>{intent}</strong> request.</p><div className="plan-card"><span>01</span><p>Inspect the relevant context</p><span>02</span><p>Prepare a preview of the changes</p><span>03</span><p>Ask before changing anything</p></div><p className="muted-copy">This action needs a connector that is not enabled in this build.</p></>;
  if (results.length) return <><p>I searched your local folders and found {results.length} likely match{results.length === 1 ? "" : "es"} for “{extractSearchTerms(query) || query}”.</p><div className="source-stack">{results.slice(0, 3).map((result) => <button key={result.id} onClick={() => void openFile(result.path)}><FileText size={15} /><span>{result.name}</span><ChevronRight size={14} /></button>)}</div></>;
  return <p>I can search local files in this build. Ask me to find a document, project, image, or download.</p>;
}

function viewLabel(view: View) { return view === "assistant" ? "Response" : nav.find((item) => item.view === view)?.label ?? "Settings"; }
function formatSize(bytes: number) { if (!bytes) return "—"; if (bytes < 1024) return `${bytes} B`; if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`; return `${(bytes / 1_048_576).toFixed(1)} MB`; }
function formatTime(seconds: number) { const date = new Date(seconds * 1000); const delta = Date.now() - date.getTime(); if (delta < 3_600_000) return `${Math.max(1, Math.round(delta / 60_000))}m ago`; if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h ago`; return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function loadJson<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }

export default App;
