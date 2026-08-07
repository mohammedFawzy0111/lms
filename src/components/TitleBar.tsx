import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { Minus, Square, X, Microscope, Search } from "lucide-react";
import { useSettingsStore } from "../stores/settingsStore";
import { useAuthStore } from "../stores/authStore";
import "./styles/TitleBar.css";

const appWindow = getCurrentWindow();

interface SearchResult {
  kind:     string;
  id:       string;
  title:    string;
  subtitle: string;
  extra:    string | null;
}
interface ApiResult<T> { ok: boolean; data: T | null; error: string | null; }

const KIND_LABEL: Record<string, string> = {
  patient: "Patient", investigation: "Test", request: "Request", invoice: "Invoice", receipt: "Receipt",
};

export default function TitleBar() {
  const settings = useSettingsStore((s) => s.settings);
  const session  = useAuthStore((s) => s.session);
  const navigate = useNavigate();

  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open,    setOpen]    = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const res = await invoke<ApiResult<SearchResult[]>>("cmd_global_search", { query });
      if (res.ok && res.data) { setResults(res.data); setOpen(true); }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(r: SearchResult) {
    setOpen(false);
    setQuery("");
    switch (r.kind) {
      case "patient":       navigate("/patients"); break;
      case "investigation": navigate("/investigations"); break;
      case "request":       navigate("/requests"); break;
      case "invoice":
      case "receipt":       navigate("/billing"); break;
    }
  }

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar__left" data-tauri-drag-region>
        <div className="titlebar__logo">
          <Microscope size={13} />
        </div>
        <span className="titlebar__name" data-tauri-drag-region>
          {settings?.lab_name ?? "LMS"}
        </span>
      </div>

      {session && (
        <div className="titlebar__search" ref={boxRef}>
          <Search size={12} className="titlebar__search-icon" />
          <input
            className="titlebar__search-input"
            placeholder="Search patients, tests, requests, invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setOpen(true)}
          />
          {open && results.length > 0 && (
            <div className="titlebar__search-results">
              {results.map((r) => (
                <div key={r.kind + r.id + r.title} className="search-result-item" onClick={() => goTo(r)}>
                  <span className="search-result-item__kind">{KIND_LABEL[r.kind] ?? r.kind}</span>
                  <div className="search-result-item__body">
                    <span className="search-result-item__title">{r.title}</span>
                    <span className="search-result-item__subtitle">
                      {r.subtitle}{r.extra ? ` · ${r.extra}` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {open && query.trim() && results.length === 0 && (
            <div className="titlebar__search-results">
              <div className="search-result-empty">No results found</div>
            </div>
          )}
        </div>
      )}

      <div className="titlebar__controls">
        <button className="titlebar__btn" onClick={() => appWindow.minimize()} title="Minimize">
          <Minus size={12} />
        </button>
        <button className="titlebar__btn" onClick={() => appWindow.toggleMaximize()} title="Maximize">
          <Square size={11} />
        </button>
        <button className="titlebar__btn titlebar__btn--close" onClick={() => appWindow.close()} title="Close">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
