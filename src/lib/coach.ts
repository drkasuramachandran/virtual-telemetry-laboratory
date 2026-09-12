// Shared feedback model consumed by the ONE Engineering Coach component.
// Every lab produces CoachNote[] instead of writing bespoke feedback UI.

export type Severity = "good" | "warning" | "error" | "info";

export interface CoachNote {
  id: string;
  severity: Severity;
  title: string;
  detail?: string;
  /** Concrete "try this" redesign hint — the heart of the pedagogical loop. */
  suggestion?: string;
}

const ORDER: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
  good: 3,
};

export function sortNotes(notes: CoachNote[]): CoachNote[] {
  return [...notes].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

export function note(
  id: string,
  severity: Severity,
  title: string,
  detail?: string,
  suggestion?: string,
): CoachNote {
  return { id, severity, title, detail, suggestion };
}
