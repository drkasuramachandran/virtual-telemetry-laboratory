import React from "react";
import { WizardField } from "@/components/wizard/types";

interface FieldProps {
  field: WizardField;
  value: any;
  onChange: (v: any) => void;
}

const inputBase =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

export const Field: React.FC<FieldProps> = ({ field, value, onChange }) => {
  const testid = `field-${field.id}`;

  if (field.type === "info") {
    return (
      <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{field.label}: </span>
        {field.info}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        {field.label}
        {field.unit && <span className="font-mono text-xs text-muted-foreground">({field.unit})</span>}
      </label>

      {field.type === "select" && (
        <select className={inputBase} value={value ?? ""} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
          <option value="" disabled>
            Select…
          </option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "number" && (
        <input
          type="number"
          className={inputBase}
          value={value ?? ""}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          data-testid={testid}
        />
      )}

      {field.type === "slider" && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            className="flex-1 accent-[hsl(var(--primary))]"
            value={value ?? field.min ?? 0}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => onChange(Number(e.target.value))}
            data-testid={testid}
          />
          <span className="w-20 shrink-0 text-right font-mono text-sm text-primary">
            {value ?? field.min ?? 0}
            {field.unit ? ` ${field.unit}` : ""}
          </span>
        </div>
      )}

      {field.type === "radio" && (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              data-testid={`${testid}-${o.value}`}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                value === o.value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {field.type === "multiselect" && (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o) => {
            const arr: string[] = Array.isArray(value) ? value : [];
            const on = arr.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(on ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
                data-testid={`${testid}-${o.value}`}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {field.type === "textarea" && (
        <textarea
          className={`${inputBase} min-h-[70px]`}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testid}
        />
      )}

      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
    </div>
  );
};
