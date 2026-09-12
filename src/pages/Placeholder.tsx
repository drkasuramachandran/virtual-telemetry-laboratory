import React from "react";
import { Link } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import { PipelineDiagram } from "@/components/PipelineDiagram";

export interface PlaceholderProps {
  title: string;
  description: string;
  phase?: string;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ title, description, phase }) => (
  <div className="mx-auto max-w-3xl space-y-6" data-testid="placeholder-page">
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={14} /> Back to home
    </Link>

    <div className="rounded-2xl border border-border bg-card/40 p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Construction size={22} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          {phase && (
            <span className="font-mono text-xs text-muted-foreground">Planned for {phase}</span>
          )}
        </div>
      </div>
      <p className="mt-4 text-muted-foreground">{description}</p>
      <div className="mt-6 rounded-xl border border-border bg-background/40 p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Shared telemetry pipeline
        </p>
        <PipelineDiagram animate height={120} />
      </div>
    </div>
  </div>
);
