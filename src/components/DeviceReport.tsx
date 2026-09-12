import React from "react";
import { FileText, Download } from "lucide-react";
import { Answers } from "@/components/wizard/types";
import { runRubric, Rubric } from "@/lib/scoring";
import { recordScore, makeId } from "@/lib/storage";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";

export interface ReportSection {
  title: string;
  rows: [string, string][];
}

interface DeviceReportProps {
  labId: string;
  title: string;
  answers: Answers;
  rubric: Rubric<Answers>;
  sections: ReportSection[];
}

/** Generic scored design report — reused by every device lab. */
export const DeviceReport: React.FC<DeviceReportProps> = ({ labId, title, answers, rubric, sections }) => {
  const score = React.useMemo(() => runRubric(rubric, answers), [rubric, answers]);

  React.useEffect(() => {
    recordScore({ id: makeId(), labId, percent: score.percent, grade: score.grade, createdAt: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = () => {
    const lines = [
      `${title.toUpperCase()} — DESIGN REPORT`,
      "Educational simulation only — not for diagnosis or clinical use.",
      "",
      `Overall score: ${score.percent}% (${score.grade})`,
      "",
      ...sections.flatMap((s) => [s.title.toUpperCase(), ...s.rows.map(([k, v]) => `  ${k}: ${v}`), ""]),
      "SCORE BREAKDOWN:",
      ...score.breakdown.map((l) => `  ${l.label}: ${l.points}/${l.maxPoints} — ${l.note ?? ""}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${labId}-design-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-testid="design-report">
      <MedicalDisclaimer />
      <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <FileText size={22} className="text-primary" />
        <div>
          <h3 className="font-display text-lg font-bold">{title} — Design Report</h3>
          <p className="font-mono text-xs text-muted-foreground">auto-generated · shared scoring engine</p>
        </div>
        <div className="ml-auto text-right">
          <div className="font-display text-3xl font-bold text-primary" data-testid="report-score">{score.percent}%</div>
          <div className="font-mono text-xs text-muted-foreground">grade {score.grade}</div>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${score.percent}%` }} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((s) => (
          <div key={s.title} className="rounded-lg border border-border bg-card/40 p-4">
            <h4 className="mb-2 font-display text-sm font-semibold">{s.title}</h4>
            <dl className="space-y-1 text-sm">
              {s.rows.map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-40 shrink-0 font-mono text-xs text-muted-foreground">{k}</dt>
                  <dd className="text-foreground/90">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card/40 p-4">
        <h4 className="mb-3 font-display text-sm font-semibold">Score breakdown</h4>
        <div className="space-y-2">
          {score.breakdown.map((l) => (
            <div key={l.id} className="text-xs">
              <div className="flex items-center gap-2">
                <span className="w-40 shrink-0 text-muted-foreground">{l.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.round(l.ratio * 100)}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right font-mono">{l.points}/{l.maxPoints}</span>
              </div>
              {l.note && <p className="mt-0.5 pl-2 text-[11px] text-muted-foreground">{l.note}</p>}
            </div>
          ))}
        </div>
      </div>
      <button onClick={download} data-testid="download-report" className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
        <Download size={15} /> Download report (.txt)
      </button>
    </div>
  );
};
