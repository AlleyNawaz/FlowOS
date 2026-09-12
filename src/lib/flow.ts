import { invoke } from "@tauri-apps/api/core";
import type { Preferences, SearchResponse } from "./types";

export const DEFAULT_PREFERENCES: Preferences = {
  includeHidden: false,
  searchDocuments: true,
  searchDesktop: true,
  searchDownloads: true,
  saveHistory: true,
};

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export async function searchFiles(query: string, preferences: Preferences): Promise<SearchResponse> {
  if (!query.trim()) {
    return { results: [], scanned: 0, elapsedMs: 0, truncated: false };
  }

  if (!isTauriRuntime()) {
    return demoSearch(query);
  }

  const locations = [
    preferences.searchDocuments && "documents",
    preferences.searchDesktop && "desktop",
    preferences.searchDownloads && "downloads",
  ].filter(Boolean);

  return invoke<SearchResponse>("search_files", {
    query,
    locations,
    includeHidden: preferences.includeHidden,
  });
}

export async function revealFile(path: string): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("reveal_file", { path });
}

export async function openFile(path: string): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("open_file", { path });
}

export function classifyIntent(query: string): "search" | "summarize" | "organize" | "schedule" | "create" | "ask" {
  const value = query.toLowerCase();
  if (/\b(find|show|where|locate|search)\b/.test(value)) return "search";
  if (/\b(summarize|summary|recap|explain)\b/.test(value)) return "summarize";
  if (/\b(clean|organize|rename|move|sort)\b/.test(value)) return "organize";
  if (/\b(schedule|calendar|meeting|tomorrow)\b/.test(value)) return "schedule";
  if (/\b(create|write|draft|make|prepare)\b/.test(value)) return "create";
  return "ask";
}

export function extractSearchTerms(query: string): string {
  return query
    .replace(/\b(please|can you|could you|find|show me|show|where is|locate|search for|my|the|a|an|file|document|latest|newest|most recent|recently|recent)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function demoSearch(query: string): Promise<SearchResponse> {
  const now = Date.now() / 1000;
  const candidates = [
    { id: "demo-1", name: "Project Northstar — Brief.pdf", path: "~/Documents/Projects/Northstar/Brief.pdf", kind: "document" as const, modified: now - 3900, size: 2_480_000, score: 92 },
    { id: "demo-2", name: "Product roadmap Q4.md", path: "~/Documents/FlowOS/Product roadmap Q4.md", kind: "document" as const, modified: now - 86400, size: 18_240, score: 87 },
    { id: "demo-3", name: "FlowOS command-center.tsx", path: "~/Developer/FlowOS/src/App.tsx", kind: "code" as const, modified: now - 1220, size: 31_400, score: 78 },
    { id: "demo-4", name: "Whiteboard 2026-09-12.png", path: "~/Desktop/Whiteboard 2026-09-12.png", kind: "image" as const, modified: now - 43200, size: 4_120_000, score: 72 },
  ];
  const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  const matching = candidates.filter((item) => words.length === 0 || words.some((word) => `${item.name} ${item.path}`.toLowerCase().includes(word)));
  await new Promise((resolve) => setTimeout(resolve, 180));
  return { results: matching.length ? matching : candidates.slice(0, 3), scanned: 12847, elapsedMs: 38, truncated: false };
}
