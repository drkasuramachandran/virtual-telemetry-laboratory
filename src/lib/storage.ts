// Local persistence for student projects and scores (localStorage).
// Namespaced keys, safe JSON, and typed helpers used across all labs.

const NS = "vwtl"; // Virtual Wireless Telemetry Laboratory

function key(...parts: string[]): string {
  return [NS, ...parts].join(":");
}

export function readJSON<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(k));
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(k: string, value: T): void {
  try {
    localStorage.setItem(key(k), JSON.stringify(value));
  } catch {
    /* storage full or unavailable — non-fatal for a simulation */
  }
}

export function removeKey(k: string): void {
  try {
    localStorage.removeItem(key(k));
  } catch {
    /* ignore */
  }
}

// ---- Projects -------------------------------------------------------------

export interface Project {
  id: string;
  labId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

const PROJECTS_KEY = "projects";

export function listProjects(): Project[] {
  return readJSON<Project[]>(PROJECTS_KEY, []);
}

export function saveProject(project: Project): Project[] {
  const all = listProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  const now = new Date().toISOString();
  const next = { ...project, updatedAt: now };
  if (idx >= 0) all[idx] = next;
  else all.push({ ...next, createdAt: next.createdAt || now });
  writeJSON(PROJECTS_KEY, all);
  return all;
}

export function deleteProject(id: string): Project[] {
  const all = listProjects().filter((p) => p.id !== id);
  writeJSON(PROJECTS_KEY, all);
  return all;
}

// ---- Scores ---------------------------------------------------------------

export interface ScoreRecord {
  id: string;
  labId: string;
  percent: number;
  grade: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

const SCORES_KEY = "scores";

export function listScores(): ScoreRecord[] {
  return readJSON<ScoreRecord[]>(SCORES_KEY, []);
}

export function recordScore(record: ScoreRecord): ScoreRecord[] {
  const all = listScores();
  all.push(record);
  writeJSON(SCORES_KEY, all);
  return all;
}

export function bestScore(labId: string): ScoreRecord | null {
  const scoped = listScores().filter((s) => s.labId === labId);
  if (!scoped.length) return null;
  return scoped.reduce((a, b) => (b.percent > a.percent ? b : a));
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
