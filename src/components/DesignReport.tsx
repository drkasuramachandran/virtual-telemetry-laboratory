import React from "react";
import { FileText, Download } from "lucide-react";
import { Answers } from "@/components/wizard/types";
import { runRubric } from "@/lib/scoring";
import { ECG_RUBRIC } from "@/lib/ecg/ecgScoring";
import { adcMetrics, battery, effectiveDataRateKbps, bandwidth } from "@/lib/ecg/ecgDerive";
import { formatBytes, edgeMode } from "@/lib/power";
import { WIRELESS } from "@/lib/wireless";
import { FAULTS } from "@/lib/ecg/faults";
import { recordScore, makeId } from "@/lib/storage";

const LABELS: Record<string, Record<string, string>> = {
  q_user: { icu: "Hospital ICU", home: "Home monitoring", ambulatory: "Ambulatory / wearable", trial: "Clinical trial" },
  q_accuracy: { diagnostic: "Diagnostic (0.05–150 Hz)", monitoring: "Monitoring (0.5–40 Hz)" },
  q_mode: { continuous: "Continuous", periodic: "Periodic" },
  q_latency: { realtime: "Real-time (<1 s)", seconds: "Seconds", minutes: "Minutes" },
  q_env: { clinical: "Clinical / low-noise", home: "Home", motion: "Motion / ambulatory" },
  q_battery: { battery: "Battery-powered", mains: "Mains-powered" },
  q_sensor: { agagcl: "Ag/AgCl wet electrodes", dry: "Dry electrodes", capacitive: "Capacitive electrodes", optical: "Optical (PPG)" },
};

function lbl(field: string, v: any): string {
  return LABELS[field]?.[v] ?? String(v ?? "—");
}

export const DesignReport: React.FC<{ answers: Answers }> = ({ answers: a }) => {
  const score = React.useMemo(() => runRubric(ECG_RUBRIC, a), [a]);
  const m = adcMetrics(a);
  const b = battery(a);
  const tech = WIRELESS.find((t) => t.id === a.q_wireless);
  const em = edgeMode(a.q_edge || "raw");
  const fault = FAULTS.find((f) => f.id === a.q_fault);

  React.useEffect(() => {
    recordScore({
      id: makeId(),
      labId: "ecg",
      percent: score.percent,
      grade: score.grade,
      createdAt: new Date().toISOString(),
      meta: { wireless: a.q_wireless },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = () => {
    const lines = [
      "WIRELESS ECG — DESIGN REPORT",
      "Educational simulation only — not for diagnosis or clinical use.",
      "",
      `Overall score: ${score.percent}% (${score.grade})`,
      "",
      "PROBLEM: " + [lbl("q_user", a.q_user), lbl("q_accuracy", a.q_accuracy), lbl("q_mode", a.q_mode), lbl("q_latency", a.q_latency), lbl("q_env", a.q_env), lbl("q_battery", a.q_battery)].join(", "),
      `SENSOR: ${lbl("q_sensor", a.q_sensor)} — ${a.q_sensor_justify ?? ""}`,
      `CONDITIONING: gain ${a.q_gain}×, HP ${a.q_hp} Hz, LP ${a.q_lp} Hz, notch ${a.q_notch} Hz`,
      `SAMPLING: ${m.samplesPerSec} Hz, ${m.bitsPerSample}-bit, Nyquist ${m.nyquist} Hz, ${m.rawDataRateBps} bps, ${formatBytes(m.dailyBytes)}/day`,
      `EDGE: ${em.label} (effective ${effectiveDataRateKbps(a).toFixed(2)} kbps)`,
      `WIRELESS: ${tech?.name ?? "—"}`,
      `POWER: avg ${b.avgCurrentMa} mA, ${b.powerMw} mW, ~${b.days} days`,
      `FAULT: ${fault?.name ?? "—"} → diagnosis ${a.q_diagnosis ?? "—"}, fix ${a.q_fix ?? "—"}`,
      "",
      "TRADE-OFFS: " + (a.q_tradeoff ?? ""),
      "JUSTIFICATION: " + (a.q_justify ?? ""),
      "",
      "SCORE BREAKDOWN:",
      ...score.breakdown.map((l) => `  ${l.label}: ${l.points}/${l.maxPoints} — ${l.note ?? ""}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ecg-design-report.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const Section: React.FC<{ title: string; rows: [string, string][] }> = ({ title, rows }) => (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <h4 className="mb-2 font-display text-sm font-semibold">{title}</h4>
      <dl className="space-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-40 shrink-0 font-mono text-xs text-muted-foreground">{k}</dt>
            <dd className="text-foreground/90">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <div className="space-y-4" data-testid="design-report">
      <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <FileText size={22} className="text-primary" />
        <div>
          <h3 className="font-display text-lg font-bold">Design Report</h3>
          <p className="font-mono text-xs text-muted-foreground">auto-generated from your guided design</p>
        </div>
        <div className="ml-auto text-right">
          <div className="font-display text-3xl font-bold text-primary" data-testid="report-score">
            {score.percent}%
          </div>
          <div className="font-mono text-xs text-muted-foreground">grade {score.grade}</div>
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${score.percent}%` }} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Section title="Problem statement" rows={[["User", lbl("q_user", a.q_user)], ["Accuracy", lbl("q_accuracy", a.q_accuracy)], ["Mode", lbl("q_mode", a.q_mode)], ["Latency", lbl("q_latency", a.q_latency)], ["Environment", lbl("q_env", a.q_env)], ["Power", lbl("q_battery", a.q_battery)], ["Bandwidth", `${bandwidth(a)} Hz`]]} />
        <Section title="Sensing & conditioning" rows={[["Sensor", lbl("q_sensor", a.q_sensor)], ["Gain", `${a.q_gain}×`], ["High-pass", `${a.q_hp} Hz`], ["Low-pass", `${a.q_lp} Hz`], ["Notch", `${a.q_notch} Hz`]]} />
        <Section title="Sampling & edge" rows={[["Sampling", `${m.samplesPerSec} Hz`], ["Resolution", `${m.bitsPerSample}-bit`], ["Nyquist", `${m.nyquist} Hz`], ["Raw rate", `${m.rawDataRateBps} bps`], ["Per day", formatBytes(m.dailyBytes)], ["Edge mode", em.label], ["Effective rate", `${effectiveDataRateKbps(a).toFixed(2)} kbps`]]} />
        <Section title="Telemetry & power" rows={[["Wireless", tech?.name ?? "—"], ["Packet loss", `${a.q_loss ?? 0}%`], ["Tx interval", `${a.q_txinterval ?? "—"} ms`], ["Avg current", `${b.avgCurrentMa} mA`], ["Power", `${b.powerMw} mW`], ["Battery life", `~${b.days} days`], ["Fault handled", fault?.name ?? "—"]]} />
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
              {l.note && <p className="ml-42 mt-0.5 pl-2 text-[11px] text-muted-foreground">{l.note}</p>}
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
