import React from "react";
import { GraduationCap, ChevronDown } from "lucide-react";

/** Reusable "Why does this matter?" panel — links a stage to the concept behind it. */
export const WhyPanel: React.FC<{ title: string; body: string }> = ({ title, body }) => {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5" data-testid="why-panel">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <GraduationCap size={15} className="text-primary" />
        <span className="text-sm font-semibold text-primary">Why does this matter? · {title}</span>
        <ChevronDown
          size={15}
          className={`ml-auto text-primary transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className="px-3 pb-3 text-sm text-muted-foreground">{body}</p>}
    </div>
  );
};
