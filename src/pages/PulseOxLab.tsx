import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { StageWizard } from "@/components/wizard/StageWizard";
import { PULSEOX_STAGES } from "@/lib/pulseox/pulseoxConfig";

export default function PulseOxLab() {
  return (
    <div className="space-y-5" data-testid="pulseox-lab-page">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><Fingerprint size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Pulse Oximeter — Guided Design</h1>
          <span className="font-mono text-xs text-muted-foreground">red/IR PPG · SpO₂ + HR · BLE</span>
        </div>
      </div>
      <MedicalDisclaimer />
      <StageWizard labId="pulse-ox" stages={PULSEOX_STAGES} title="Pulse Oximeter Guided Design" />
    </div>
  );
}
