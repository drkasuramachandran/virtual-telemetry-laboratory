import React from "react";
import { ChevronLeft, ChevronRight, Play, Check } from "lucide-react";
import { WizardStageConfig, Answers } from "@/components/wizard/types";
import { Field } from "@/components/wizard/Field";
import { WhyPanel } from "@/components/WhyPanel";
import { EngineeringCoach } from "@/components/EngineeringCoach";
import {
  listProjects,
  saveProject,
  makeId,
  Project,
} from "@/lib/storage";

interface StageWizardProps {
  labId: string;
  stages: WizardStageConfig[];
  title?: string;
}

function defaultsFor(stages: WizardStageConfig[]): Answers {
  const a: Answers = {};
  stages.forEach((s) => s.fields.forEach((f) => { if (f.default !== undefined) a[f.id] = f.default; }));
  return a;
}

const METRIC_TONE: Record<string, string> = {
  default: "text-foreground",
  good: "text-emerald-400",
  warning: "text-amber-300",
  error: "text-red-400",
};

export const StageWizard: React.FC<StageWizardProps> = ({ labId, stages, title }) => {
  const projectIdRef = React.useRef<string>("");
  const [answers, setAnswers] = React.useState<Answers>(() => {
    const existing = listProjects().find((p) => p.labId === labId);
    if (existing) {
      projectIdRef.current = existing.id;
      return { ...defaultsFor(stages), ...(existing.data as Answers) };
    }
    projectIdRef.current = makeId();
    return defaultsFor(stages);
  });
  const [idx, setIdx] = React.useState(0);
  const [revealed, setRevealed] = React.useState<Set<string>>(new Set());

  const stage = stages[idx];

  const persist = React.useCallback(
    (next: Answers) => {
      const project: Project = {
        id: projectIdRef.current,
        labId,
        title: title ?? labId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: next,
      };
      saveProject(project);
    },
    [labId, title],
  );

  const set = React.useCallback(
    (id: string, v: any) => {
      setAnswers((prev) => {
        const next = { ...prev, [id]: v };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  // run onEnter once per stage
  const enteredRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (stage.onEnter && !enteredRef.current.has(stage.id)) {
      enteredRef.current.add(stage.id);
      stage.onEnter(answers, set);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const isRevealed = revealed.has(stage.id);
  const predictionKey = `${stage.id}__predict`;
  const predictionAnswered = !stage.prediction || (answers[predictionKey] ?? "").trim().length > 0;

  const analysis = React.useMemo(
    () => (isRevealed && stage.analyze ? stage.analyze(answers) : null),
    [isRevealed, stage, answers],
  );

  const reveal = () => setRevealed((s) => new Set(s).add(stage.id));

  const go = (n: number) => {
    setIdx((i) => Math.max(0, Math.min(stages.length - 1, i + n)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Stepper */}
      <aside className="lg:sticky lg:top-[73px] lg:h-fit">
        <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible" data-testid="wizard-stepper">
          {stages.map((s, i) => {
            const done = revealed.has(s.id);
            const current = i === idx;
            return (
              <li key={s.id} className="shrink-0">
                <button
                  onClick={() => setIdx(i)}
                  data-testid={`stepper-${s.id}`}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                    current ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      current ? "border-primary bg-primary text-primary-foreground" : done ? "border-emerald-500 text-emerald-400" : "border-border"
                    }`}
                  >
                    {done && !current ? <Check size={11} /> : i + 1}
                  </span>
                  <span className="hidden truncate lg:inline">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      {/* Stage content */}
      <div className="min-w-0 space-y-5" data-testid={`wizard-stage-${stage.id}`}>
        <div>
          <span className="font-mono text-xs text-muted-foreground">
            Stage {idx + 1} / {stages.length}
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight">{stage.title}</h2>
          {stage.subtitle && <p className="mt-1 text-sm text-muted-foreground">{stage.subtitle}</p>}
        </div>

        <WhyPanel title={stage.concept.title} body={stage.concept.body} />

        <div className="grid gap-4 rounded-xl border border-border bg-card/40 p-4 sm:grid-cols-2">
          {stage.fields.map((f) => (
            <div key={f.id} className={f.type === "textarea" || f.type === "info" || f.type === "multiselect" ? "sm:col-span-2" : ""}>
              <Field field={f} value={answers[f.id]} onChange={(v) => set(f.id, v)} />
            </div>
          ))}
        </div>

        {stage.prediction && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <label className="text-sm font-semibold text-accent">Predict first</label>
            <p className="mt-1 text-sm text-muted-foreground">{stage.prediction}</p>
            <textarea
              className="mt-2 min-h-[60px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={answers[predictionKey] ?? ""}
              onChange={(e) => set(predictionKey, e.target.value)}
              placeholder="Write your prediction before revealing the simulated result…"
              data-testid={`prediction-${stage.id}`}
            />
          </div>
        )}

        {(stage.analyze || stage.visualize) && (
          <button
            onClick={reveal}
            disabled={!predictionAnswered}
            data-testid={`reveal-${stage.id}`}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play size={15} /> {isRevealed ? "Re-run simulation" : "Run simulation & get feedback"}
          </button>
        )}
        {stage.prediction && !predictionAnswered && (
          <p className="text-xs text-accent">Enter your prediction to unlock the simulation.</p>
        )}

        {isRevealed && (
          <div className="space-y-4" data-testid={`results-${stage.id}`}>
            {stage.visualize && stage.visualize(answers, set)}
            {analysis?.metrics && analysis.metrics.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg border border-border bg-card/40 px-3 py-2">
                    <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
                    <div className={`text-lg font-semibold ${METRIC_TONE[m.tone ?? "default"]}`}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}
            {analysis && <EngineeringCoach title="Engineering Coach" notes={analysis.notes} />}
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <button
            onClick={() => go(-1)}
            disabled={idx === 0}
            data-testid="wizard-prev"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40"
          >
            <ChevronLeft size={15} /> Back
          </button>
          <button
            onClick={() => go(1)}
            disabled={idx === stages.length - 1}
            data-testid="wizard-next"
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium disabled:opacity-40"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
