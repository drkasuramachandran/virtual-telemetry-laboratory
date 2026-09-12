import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Droplet, FlaskConical } from "lucide-react";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { StageWizard } from "@/components/wizard/StageWizard";
import { CGM_STAGES } from "@/lib/cgm/cgmConfig";

export default function CgmLab() {
  return (
    <div className="space-y-5" data-testid="cgm-lab-page">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><Droplet size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Continuous Glucose Monitor — Guided Design</h1>
          <span className="font-mono text-xs text-muted-foreground">electrochemical · trend + alerts · conceptual</span>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-amber-200" data-testid="cgm-conceptual-note">
        <FlaskConical size={14} className="shrink-0" />
        Conceptual model only — a simplified educational abstraction, not a real glucose sensor or clinical algorithm.
      </div>
      <MedicalDisclaimer />
      <StageWizard labId="cgm" stages={CGM_STAGES} title="CGM (Conceptual) Guided Design" />
    </div>
  );
}
