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
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function searchFiles(query: string, preferences: Preferences): Promise<SearchResponse> {
  if (!query.trim()) {
    return { results: [], scanned: 0, elapsedMs: 0, truncated: false };
  }

  if (!isTauriRuntime()) {
    throw new Error("Local file search requires the FlowOS desktop application.");
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
