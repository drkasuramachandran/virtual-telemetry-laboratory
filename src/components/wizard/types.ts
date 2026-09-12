import React from "react";
import { CoachNote } from "@/lib/coach";

export type Answers = Record<string, any>;

export type FieldType =
  | "select"
  | "number"
  | "slider"
  | "radio"
  | "multiselect"
  | "textarea"
  | "info";

export interface FieldOption {
  value: string;
  label: string;
}

export interface WizardField {
  id: string;
  label: string;
  type: FieldType;
  help?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  default?: any;
  placeholder?: string;
  info?: string; // for type "info"
}

export interface Metric {
  label: string;
  value: string;
  tone?: "default" | "good" | "warning" | "error";
}

export interface StageAnalysis {
  notes: CoachNote[];
  metrics?: Metric[];
}

export interface WizardStageConfig {
  id: string;
  title: string;
  subtitle?: string;
  concept: { title: string; body: string };
  prediction?: string;
  fields: WizardField[];
  /** Feedback + derived metrics computed from the full answer set. */
  analyze?: (answers: Answers) => StageAnalysis;
  /** Optional custom visualization (waveforms, tables, pipeline, report). */
  visualize?: (answers: Answers, set: (id: string, v: any) => void) => React.ReactNode;
  /** Called once when the stage is entered (e.g. inject a random fault). */
  onEnter?: (answers: Answers, set: (id: string, v: any) => void) => void;
}
