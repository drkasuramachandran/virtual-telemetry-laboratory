import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, Compass } from "lucide-react";
import { CoachNote, Severity, sortNotes } from "@/lib/coach";
import { ScoreResult } from "@/lib/scoring";

const SEVERITY_META: Record<
  Severity,
  { icon: React.ComponentType<{ size?: number; className?: string }>; ring: string; text: string; label: string }
> = {
  error: { icon: XCircle, ring: "border-l-red-500/80 bg-red-500/5", text: "text-red-400", label: "Fault" },
  warning: { icon: AlertTriangle, ring: "border-l-amber-400/80 bg-amber-400/5", text: "text-amber-300", label: "Warning" },
  info: { icon: Info, ring: "border-l-sky-400/80 bg-sky-400/5", text: "text-sky-300", label: "Note" },
  good: { icon: CheckCircle2, ring: "border-l-emerald-400/80 bg-emerald-400/5", text: "text-emerald-300", label: "Good" },
};

export interface EngineeringCoachProps {
  title?: string;
  notes: CoachNote[];
  score?: ScoreResult | null;
  emptyMessage?: string;
}

export const EngineeringCoach: React.FC<EngineeringCoachProps> = ({
  title = "Engineering Coach",
  notes,
  score = null,
  emptyMessage = "Run a simulation to get engineering feedback.",
}) => {
  const sorted = sortNotes(notes);
  return (
    <div
      className="rounded-xl border border-border bg-card/60 backdrop-blur"
      data-testid="engineering-coach"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Compass size={16} className="text-primary" />
        <h3 className="font-display text-sm font-semibold tracking-wide text-foreground">
          {title}
        </h3>
        {score && (
          <span
            className="ml-auto font-mono text-xs text-muted-foreground"
            data-testid="coach-score"
          >
            {score.percent}% · <span className="text-primary">{score.grade}</span>
          </span>
        )}
      </div>

      {score && (
        <div className="border-b border-border px-4 py-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${score.percent}%` }}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            {score.breakdown.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-xs">
                <span className="w-40 shrink-0 truncate text-muted-foreground">{b.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.round(b.ratio * 100)}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-muted-foreground">
                  {b.points}/{b.maxPoints}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 p-3">
        {sorted.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        )}
        {sorted.map((n) => {
          const meta = SEVERITY_META[n.severity];
          const Icon = meta.icon;
          return (
            <div
              key={n.id}
              className={`rounded-md border-l-2 px-3 py-2 ${meta.ring}`}
              data-testid={`coach-note-${n.id}`}
            >
              <div className="flex items-start gap-2">
                <Icon size={15} className={`mt-0.5 shrink-0 ${meta.text}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  {n.detail && <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>}
                  {n.suggestion && (
                    <p className="mt-1 text-xs text-primary/90">
                      <span className="font-semibold">Try:</span> {n.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
