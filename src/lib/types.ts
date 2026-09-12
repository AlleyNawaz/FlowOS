export type View = "home" | "search" | "assistant" | "recents" | "settings";

export interface SearchResult {
  id: string;
  name: string;
  path: string;
  kind: "document" | "image" | "folder" | "code" | "archive" | "other";
  modified: number;
  size: number;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  scanned: number;
  elapsedMs: number;
  truncated: boolean;
}

export interface Preferences {
  includeHidden: boolean;
  searchDocuments: boolean;
  searchDesktop: boolean;
  searchDownloads: boolean;
  saveHistory: boolean;
}

export interface HistoryItem {
  query: string;
  resultCount: number;
  timestamp: number;
}
