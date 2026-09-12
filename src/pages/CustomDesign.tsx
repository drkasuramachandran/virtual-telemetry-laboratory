import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Cpu } from "lucide-react";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { StageWizard } from "@/components/wizard/StageWizard";
import { CUSTOM_STAGES } from "@/lib/custom/customConfig";
import { listProjects } from "@/lib/storage";

export default function CustomDesign() {
  const { labId } = useParams();
  const project = listProjects().find((p) => p.labId === labId);
  const title = project?.title ?? "Custom Telemetry Device";

  return (
    <div className="space-y-5" data-testid="custom-design-page">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to projects
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><Cpu size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          <span className="font-mono text-xs text-muted-foreground">custom device · guided engineering workflow</span>
        </div>
      </div>
      <MedicalDisclaimer />
      <StageWizard labId={labId ?? "custom"} stages={CUSTOM_STAGES} title={title} />
    </div>
  );
}
