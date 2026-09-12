use serde::Serialize;
use std::{
    cmp::Ordering,
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::{Instant, UNIX_EPOCH},
};

const MAX_SCANNED_FILES: usize = 60_000;
const MAX_RESULTS: usize = 60;
const MAX_DEPTH: usize = 8;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResult {
    id: String,
    name: String,
    path: String,
    kind: &'static str,
    modified: u64,
    size: u64,
    score: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResponse {
    results: Vec<SearchResult>,
    scanned: usize,
    elapsed_ms: u128,
    truncated: bool,
}

#[derive(Default)]
struct ScanState {
    scanned: usize,
    truncated: bool,
    results: Vec<SearchResult>,
}

#[tauri::command]
fn search_files(
    query: String,
    locations: Vec<String>,
    include_hidden: bool,
) -> Result<SearchResponse, String> {
    let started = Instant::now();
    let query = normalize_query(&query);
    if query.is_empty() {
        return Err("Enter at least one letter or number to search.".into());
    }

    let roots = resolve_locations(&locations)?;
    let mut state = ScanState::default();
    for root in roots {
        scan_directory(&root, &query, include_hidden, 0, &mut state);
        if state.truncated {
            break;
        }
    }

    state.results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(Ordering::Equal)
            .then_with(|| b.modified.cmp(&a.modified))
    });
    state.results.truncate(MAX_RESULTS);

    Ok(SearchResponse {
        results: state.results,
        scanned: state.scanned,
        elapsed_ms: started.elapsed().as_millis(),
        truncated: state.truncated,
    })
}

#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    let target = validate_user_path(&path)?;
    open_with_system(&target, false)
}

#[tauri::command]
fn reveal_file(path: String) -> Result<(), String> {
    let target = validate_user_path(&path)?;
    open_with_system(&target, true)
}

fn resolve_locations(locations: &[String]) -> Result<Vec<PathBuf>, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not locate your home folder.".to_string())?;
    let allowed = ["documents", "desktop", "downloads"];
    let requested: HashSet<&str> = locations.iter().map(String::as_str).collect();

    let roots = allowed
        .iter()
        .filter(|location| requested.contains(**location))
        .map(|location| match *location {
            "documents" => home.join("Documents"),
            "desktop" => home.join("Desktop"),
            "downloads" => home.join("Downloads"),
            _ => unreachable!(),
        })
        .filter(|path| path.is_dir())
        .collect::<Vec<_>>();

    if roots.is_empty() {
        return Err("Enable at least one search location in Settings.".into());
    }
    Ok(roots)
}

fn scan_directory(root: &Path, query: &str, include_hidden: bool, depth: usize, state: &mut ScanState) {
    if depth > MAX_DEPTH || state.truncated {
        return;
    }

    let entries = match fs::read_dir(root) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        if state.scanned >= MAX_SCANNED_FILES {
            state.truncated = true;
            return;
        }

        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if !include_hidden && name.starts_with('.') {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        state.scanned += 1;

        let path_text = path.to_string_lossy();
        if let Some(score) = match_score(query, &name, &path_text) {
            let modified = metadata
                .modified()
                .ok()
                .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
                .map_or(0, |value| value.as_secs());
            state.results.push(SearchResult {
                id: stable_id(&path_text),
                name: name.clone(),
                path: path_text.into_owned(),
                kind: file_kind(&path, metadata.is_dir()),
                modified,
                size: metadata.len(),
                score,
            });
        }

        if metadata.is_dir() && !metadata.file_type().is_symlink() {
            scan_directory(&path, query, include_hidden, depth + 1, state);
        }
    }
}

fn normalize_query(value: &str) -> String {
    value
        .chars()
        .filter(|character| character.is_alphanumeric() || character.is_whitespace() || *character == '-' || *character == '_')
        .collect::<String>()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn match_score(query: &str, name: &str, path: &str) -> Option<f64> {
    let query_tokens = query.split_whitespace().collect::<Vec<_>>();
    let name_lower = name.to_lowercase();
    let path_lower = path.to_lowercase();
    let stem = Path::new(name).file_stem().unwrap_or_default().to_string_lossy().to_lowercase();

    let mut score = 0.0;
    for token in &query_tokens {
        if name_lower == *token || stem == *token {
            score += 55.0;
        } else if name_lower.starts_with(token) {
            score += 34.0;
        } else if name_lower.contains(token) {
            score += 24.0;
        } else if path_lower.contains(token) {
            score += 10.0;
        } else if is_subsequence(token, &name_lower) {
            score += 5.0;
        } else {
            return None;
        }
    }

    if name_lower.contains(query) {
        score += 28.0;
    }
    score -= name_lower.len() as f64 * 0.025;
    Some((score * 10.0).round() / 10.0)
}

fn is_subsequence(needle: &str, haystack: &str) -> bool {
    let mut characters = needle.chars();
    let mut current = characters.next();
    for candidate in haystack.chars() {
        if current == Some(candidate) {
            current = characters.next();
            if current.is_none() {
                return true;
            }
        }
    }
    current.is_none()
}

fn file_kind(path: &Path, is_directory: bool) -> &'static str {
    if is_directory {
        return "folder";
    }
    match path.extension().and_then(|value| value.to_str()).unwrap_or("").to_lowercase().as_str() {
        "pdf" | "doc" | "docx" | "txt" | "md" | "rtf" | "pages" | "xls" | "xlsx" | "ppt" | "pptx" => "document",
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "heic" | "svg" => "image",
        "rs" | "ts" | "tsx" | "js" | "jsx" | "py" | "go" | "java" | "swift" | "json" | "toml" | "yaml" | "yml" => "code",
        "zip" | "gz" | "tar" | "rar" | "7z" | "dmg" => "archive",
        _ => "other",
    }
}

fn stable_id(path: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in path.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("file-{hash:x}")
}

fn validate_user_path(raw_path: &str) -> Result<PathBuf, String> {
    let target = fs::canonicalize(raw_path).map_err(|_| "That file is no longer available.".to_string())?;
    let home = dirs::home_dir().ok_or_else(|| "Could not locate your home folder.".to_string())?;
    let allowed = [home.join("Documents"), home.join("Desktop"), home.join("Downloads")];
    let is_allowed = allowed
        .iter()
        .filter_map(|root| fs::canonicalize(root).ok())
        .any(|root| target.starts_with(root));
    if !is_allowed {
        return Err("FlowOS can only open files from enabled user folders.".into());
    }
    Ok(target)
}

#[cfg(target_os = "macos")]
fn open_with_system(path: &Path, reveal: bool) -> Result<(), String> {
    let mut command = Command::new("open");
    if reveal {
        command.arg("-R");
    }
    command.arg(path);
    let status = command.status().map_err(|_| "Could not ask macOS to open that file.".to_string())?;
    status.success().then_some(()).ok_or_else(|| "macOS could not open that file.".into())
}

#[cfg(target_os = "windows")]
fn open_with_system(path: &Path, reveal: bool) -> Result<(), String> {
    let target = if reveal { path.parent().unwrap_or(path) } else { path };
    let status = Command::new("explorer").arg(target).status().map_err(|_| "Could not open that file.".to_string())?;
    status.success().then_some(()).ok_or_else(|| "Windows could not open that file.".into())
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
fn open_with_system(path: &Path, reveal: bool) -> Result<(), String> {
    let target = if reveal { path.parent().unwrap_or(path) } else { path };
    let status = Command::new("xdg-open").arg(target).status().map_err(|_| "Could not open that file.".to_string())?;
    status.success().then_some(()).ok_or_else(|| "The system could not open that file.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![search_files, open_file, reveal_file])
        .run(tauri::generate_context!())
        .expect("error while running FlowOS");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_every_query_token() {
        assert!(match_score("north brief", "Project Northstar Brief.pdf", "/Documents").is_some());
        assert!(match_score("north budget", "Project Northstar Brief.pdf", "/Documents").is_none());
    }

    #[test]
    fn exact_matches_rank_above_path_matches() {
        let exact = match_score("brief", "Brief.pdf", "/Documents").unwrap();
        let path_only = match_score("brief", "Notes.pdf", "/Documents/brief").unwrap();
        assert!(exact > path_only);
    }

    #[test]
    fn strips_query_punctuation() {
        assert_eq!(normalize_query("  Tax (2026)! "), "tax 2026");
    }
}
