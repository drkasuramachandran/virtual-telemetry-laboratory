import React from "react";
import { X, Check, AlertTriangle, Wand2, Download, ArrowRight } from "lucide-react";
import { PIPELINE_STAGES, StageId } from "@/lib/pipeline";

const CANONICAL = PIPELINE_STAGES.map((s) => s.id);

interface Props {
  value: StageId[];
  onChange: (v: StageId[]) => void;
}

export const BlockDiagramEditor: React.FC<Props> = ({ value, onChange }) => {
  const add = (id: StageId) => {
    if (!value.includes(id)) onChange([...value, id]);
  };
  const remove = (id: StageId) => onChange(value.filter((v) => v !== id));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const autoAssemble = () => onChange([...CANONICAL]);

  const missing = CANONICAL.filter((id) => !value.includes(id));
  const correctOrder = value.length === CANONICAL.length && value.every((id, i) => id === CANONICAL[i]);
  const valid = missing.length === 0 && correctOrder;

  const label = (id: StageId) => PIPELINE_STAGES.find((s) => s.id === id)?.short ?? id;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/stage") as StageId;
    if (id) add(id);
  };

  const exportDiagram = () => {
    const blob = new Blob([JSON.stringify({ pipeline: value }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "telemetry-pipeline.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3" data-testid="block-diagram-editor">
      {/* Palette */}
      <div className="rounded-xl border border-border bg-card/40 p-3">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Palette — drag or click to add a stage</p>
        <div className="flex flex-wrap gap-2">
          {PIPELINE_STAGES.map((s) => (
            <button
              key={s.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/stage", s.id)}
              onClick={() => add(s.id)}
              disabled={value.includes(s.id)}
              data-testid={`block-palette-${s.id}`}
              className="cursor-grab rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
            >
              {s.short}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        data-testid="block-canvas"
        className="min-h-[90px] rounded-xl border border-dashed border-border bg-background/40 p-3"
      >
        {value.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Drop or click stages to assemble your pipeline.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {value.map((id, i) => (
              <React.Fragment key={id}>
                <div className="group flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs text-primary" data-testid={`block-added-${id}`}>
                  <button onClick={() => move(i, -1)} className="opacity-50 hover:opacity-100" data-testid={`block-left-${id}`}>‹</button>
                  <span className="font-medium">{label(id)}</span>
                  <button onClick={() => move(i, 1)} className="opacity-50 hover:opacity-100" data-testid={`block-right-${id}`}>›</button>
                  <button onClick={() => remove(id)} className="ml-1 opacity-60 hover:opacity-100" data-testid={`block-remove-${id}`}><X size={12} /></button>
                </div>
                {i < value.length - 1 && <ArrowRight size={13} className="text-muted-foreground" />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Validation + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div data-testid="block-validation" className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${valid ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-400/15 text-amber-300"}`}>
          {valid ? <Check size={13} /> : <AlertTriangle size={13} />}
          {valid ? "Valid, complete pipeline" : missing.length ? `Missing: ${missing.map(label).join(", ")}` : "Stages out of order"}
        </div>
        <button onClick={autoAssemble} data-testid="auto-assemble-btn" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
          <Wand2 size={13} /> Auto-assemble
        </button>
        <button onClick={exportDiagram} disabled={value.length === 0} data-testid="export-diagram-btn" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-40">
          <Download size={13} /> Export JSON
        </button>
      </div>
    </div>
  );
};
