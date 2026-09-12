import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, HeartPulse } from "lucide-react";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { StageWizard } from "@/components/wizard/StageWizard";
import { ECG_STAGES } from "@/lib/ecg/ecgWizardConfig";

export default function EcgLab() {
  return (
    <div className="space-y-5" data-testid="ecg-lab-page">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <HeartPulse size={22} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Wireless ECG — Guided Engineering Project</h1>
          <span className="font-mono text-xs text-muted-foreground">10-stage design workflow · reference device</span>
        </div>
      </div>

      <MedicalDisclaimer />

      <StageWizard labId="ecg" stages={ECG_STAGES} title="Wireless ECG Guided Design" />
    </div>
  );
}
