import React from "react";
import { ShieldAlert } from "lucide-react";

const TEXT =
  "Educational simulation only — not intended for diagnosis, treatment, or clinical decision-making.";

/** Persistent, visible medical disclaimer. Required on every medical simulation. */
export const MedicalDisclaimer: React.FC<{ compact?: boolean }> = ({ compact }) => {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-200 ${
        compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
      }`}
      role="note"
      data-testid="medical-disclaimer"
    >
      <ShieldAlert size={compact ? 13 : 15} className="shrink-0" />
      <span className="font-medium leading-tight">{TEXT}</span>
    </div>
  );
};
