import React from "react";
import {
  MousePointerClick,
  Lightbulb,
  PlayCircle,
  Eye,
  Stethoscope,
  Wrench,
  GitCompare,
  MessageSquareQuote,
} from "lucide-react";

const STEPS = [
  { key: "choose", label: "Choose", icon: MousePointerClick },
  { key: "predict", label: "Predict", icon: Lightbulb },
  { key: "simulate", label: "Simulate", icon: PlayCircle },
  { key: "observe", label: "Observe", icon: Eye },
  { key: "diagnose", label: "Diagnose", icon: Stethoscope },
  { key: "redesign", label: "Redesign", icon: Wrench },
  { key: "compare", label: "Compare", icon: GitCompare },
  { key: "justify", label: "Justify", icon: MessageSquareQuote },
];

export const PedagogicalLoop: React.FC<{ active?: string }> = ({ active }) => {
  return (
    <div className="flex flex-wrap gap-2" data-testid="pedagogical-loop">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = active === s.key;
        return (
          <div
            key={s.key}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card/50 text-muted-foreground"
            }`}
          >
            <span className="font-mono text-[10px] opacity-60">{i + 1}</span>
            <Icon size={13} />
            {s.label}
          </div>
        );
      })}
    </div>
  );
};
