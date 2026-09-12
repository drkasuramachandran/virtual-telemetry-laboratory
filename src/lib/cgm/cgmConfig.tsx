import React from "react";
import { WizardStageConfig, Answers } from "@/components/wizard/types";
import { Rubric } from "@/lib/scoring";
import { Waveform } from "@/components/Waveform";
import { DeviceReport, ReportSection } from "@/components/DeviceReport";
import { note } from "@/lib/coach";
import { generateGlucose, computeTrend, alertLevel, CgmReading } from "@/lib/cgm/cgmModel";
import { formatBytes } from "@/lib/power";

const C_GLU = "hsl(38 92% 58%)";
const num = (a: Answers, id: string, f: number) => (a[id] !== undefined && a[id] !== "" && Number.isFinite(Number(a[id])) ? Number(a[id]) : f);

function cgmSeries(a: Answers): CgmReading[] {
  const interval = num(a, "q_cgm_interval", 5);
  const drift = a.q_cgm_drift === "recal" ? 6 : a.q_cgm_drift === "temp" ? 12 : 32;
  const loss = num(a, "q_cgm_loss", 3);
  return generateGlucose({ intervalMin: interval, hours: 6, driftMgDl: drift, noiseMgDl: 4, lossPct: loss });
}

export const CGM_RUBRIC: Rubric<Answers> = [
  { id: "problem", label: "Problem definition", weight: 15, evaluate: (a) => {
    const filled = ["q_cgm_user", "q_cgm_interval", "q_cgm_battery"].filter((k) => a[k]).length;
    return { ratio: filled / 3, note: filled === 3 ? "Requirements specified." : "Complete the requirements." };
  } },
  { id: "sensor", label: "Sensor & calibration", weight: 25, evaluate: (a) => {
    let r = 0; const notes: string[] = [];
    if (a.q_cgm_calib) r += 0.4;
    if (a.q_cgm_drift === "recal") r += 0.6; else if (a.q_cgm_drift === "temp") { r += 0.4; notes.push("temperature compensation helps but does not fully correct enzymatic drift"); } else notes.push("ignoring calibration drift lets the reading wander over days");
    return { ratio: Math.min(1, r), note: notes.length ? `Calibration: ${notes.join("; ")}.` : "Sound calibration-drift strategy." };
  } },
  { id: "sampling", label: "Sampling interval", weight: 20, evaluate: (a) => {
    const iv = num(a, "q_cgm_interval", 5);
    let r = 1; let n = "Sampling interval balances responsiveness and power.";
    if (iv > 15) { r = 0.5; n = "Acceptable but slow — long intervals can miss fast glucose excursions."; }
    if (iv <= 1) { r = 0.8; n = "Very frequent — responsive but higher power and data with little added clinical value."; }
    return { ratio: r, note: n };
  } },
  { id: "reliability", label: "Comm reliability", weight: 20, evaluate: (a) => {
    const loss = num(a, "q_cgm_loss", 3);
    let r = 1; const notes: string[] = [];
    if (loss > 10) { r -= 0.5; notes.push("high packet loss can drop alert-critical readings"); }
    if (a.q_cgm_retransmit === "on") r = Math.min(1, r + 0.2); else notes.push("no retransmission — a lost high/low reading is simply missed");
    return { ratio: Math.max(0, r), note: notes.length ? `Reliability: ${notes.join("; ")}.` : "Reliable delivery of readings." };
  } },
  { id: "alerts", label: "Alerts", weight: 20, evaluate: (a) => {
    const low = num(a, "q_cgm_low", 70); const high = num(a, "q_cgm_high", 180);
    let r = 1; const notes: string[] = [];
    if (low < 55 || low > 80) { r -= 0.3; notes.push("low threshold outside the typical 70 mg/dL range"); }
    if (high < 160 || high > 220) { r -= 0.3; notes.push("high threshold outside the typical 180 mg/dL range"); }
    if (high - low < 60) { r -= 0.2; notes.push("alert band is narrow — expect frequent nuisance alerts"); }
    return { ratio: Math.max(0, r), note: notes.length ? `Alerts: ${notes.join("; ")}.` : "Sensible alert thresholds." };
  } },
];

function glucoseViz(a: Answers) {
  const series = cgmSeries(a);
  const delivered = series.filter((r) => r.delivered);
  const values = delivered.map((r) => r.value);
  const last = delivered.length ? delivered[delivered.length - 1].value : 0;
  const trend = computeTrend(series);
  const low = num(a, "q_cgm_low", 70); const high = num(a, "q_cgm_high", 180);
  const level = alertLevel(last, low, high);
  return { series, values, last, trend, level, low, high };
}

export const CGM_STAGES: WizardStageConfig[] = [
  {
    id: "define",
    title: "Define the problem",
    subtitle: "Conceptual CGM — clarify the use case.",
    concept: { title: "continuous vs spot glucose", body: "A CGM trends interstitial glucose continuously so users see direction and rate of change, not just a single number. That drives the sampling interval, alerting and battery needs." },
    fields: [
      { id: "q_cgm_user", label: "User", type: "select", options: [{ value: "t1", label: "Type 1 diabetes" }, { value: "t2", label: "Type 2 diabetes" }, { value: "research", label: "Research study" }] },
      { id: "q_cgm_interval", label: "Sampling interval", type: "select", default: "5", options: [{ value: "1", label: "1 min" }, { value: "5", label: "5 min" }, { value: "15", label: "15 min" }] },
      { id: "q_cgm_battery", label: "Wear duration target", type: "select", options: [{ value: "7", label: "7 days" }, { value: "14", label: "14 days" }] },
    ],
    analyze: (a) => ({ notes: [note("cgm-def", "info", "Conceptual model", "This is an educational abstraction of a CGM — not a real sensor or clinical algorithm.")] }),
  },
  {
    id: "sensor",
    title: "Sensor & calibration",
    subtitle: "Electrochemical enzyme sensor (adaptive).",
    concept: { title: "why calibration drifts", body: "The glucose-oxidase enzyme layer degrades and its sensitivity changes with time and temperature. Without a drift strategy, the reported glucose slowly diverges from the true value over the wear period." },
    fields: [
      { id: "q_cgm_calib", label: "Calibration approach", type: "select", options: [{ value: "factory", label: "Factory-calibrated" }, { value: "finger", label: "Fingerstick calibration" }] },
      { id: "q_cgm_drift", label: "How will you handle calibration drift?", type: "select", options: [{ value: "recal", label: "Periodic recalibration" }, { value: "temp", label: "Temperature compensation only" }, { value: "ignore", label: "Ignore it" }] },
    ],
    analyze: (a) => {
      const notes = [];
      notes.push(a.q_cgm_drift === "recal" ? note("d", "good", "Periodic recalibration controls drift", "Keeps the reading anchored to a reference over the wear period.") : a.q_cgm_drift === "temp" ? note("d2", "warning", "Temperature compensation helps partially", "It corrects thermal effects but not enzyme ageing.") : note("d3", "error", "Ignoring drift is unsafe", "The reading will wander over days and could miss true highs/lows.", "Add periodic recalibration."));
      return { notes };
    },
  },
  {
    id: "sampling",
    title: "Sampling & trend",
    subtitle: "See the glucose trace and its drift.",
    concept: { title: "interval vs excursions", body: "Glucose can change several mg/dL per minute after meals. The sampling interval must be short enough to catch excursions but long enough to conserve battery over a multi-day wear." },
    fields: [],
    analyze: (a) => {
      const { series } = glucoseViz(a);
      const iv = num(a, "q_cgm_interval", 5);
      const perDay = (24 * 60) / iv;
      const bytesDay = perDay * 2; // 2 bytes/reading
      return { notes: [note("s", "info", `${series.length} readings over 6 h`, `At ${iv}-min intervals that is ~${Math.round(perDay)} readings/day.`)], metrics: [{ label: "Readings / day", value: `${Math.round(perDay)}` }, { label: "Data / day", value: formatBytes(bytesDay) }, { label: "Interval", value: `${iv} min` }] };
    },
    visualize: (a) => {
      const { values } = glucoseViz(a);
      return (
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Glucose trace (mg/dL, 6 h)</p>
          <Waveform series={[{ data: values, color: C_GLU, width: 1.6 }]} height={140} />
        </div>
      );
    },
  },
  {
    id: "reliability",
    title: "Comm reliability",
    subtitle: "Delivery of readings to the phone/cloud.",
    concept: { title: "a missed reading is a missed alert", body: "Unlike a waveform, each CGM reading is a discrete, alert-critical data point. Packet loss without retransmission means a dangerous high or low can go unreported." },
    fields: [
      { id: "q_cgm_loss", label: "Packet loss", type: "slider", min: 0, max: 40, step: 1, default: 3, unit: "%" },
      { id: "q_cgm_retransmit", label: "Retransmission / buffering", type: "radio", default: "on", options: [{ value: "on", label: "On" }, { value: "off", label: "Off" }] },
    ],
    analyze: (a) => {
      const { series } = glucoseViz(a);
      const lost = series.filter((r) => !r.delivered).length;
      const notes = [lost > 0 ? note("r", a.q_cgm_retransmit === "on" ? "info" : "warning", `${lost} readings lost in transit`, a.q_cgm_retransmit === "on" ? "Retransmission/buffering can recover these." : "With no retransmission these readings — and any alerts in them — are gone.") : note("r2", "good", "All readings delivered")];
      return { notes, metrics: [{ label: "Delivered", value: `${series.length - lost}/${series.length}`, tone: "good" }, { label: "Lost", value: `${lost}`, tone: lost ? "warning" : "default" }] };
    },
  },
  {
    id: "alerts",
    title: "Alerts & status",
    subtitle: "Thresholds, trend arrow and device status.",
    concept: { title: "trend + thresholds", body: "A CGM shows the current value, a trend arrow (rate of change) and high/low alerts so users can act before crossing a dangerous threshold. Battery and comm status keep the system trustworthy." },
    fields: [
      { id: "q_cgm_low", label: "Low alert threshold", type: "number", unit: "mg/dL", default: 70, min: 50, max: 90, step: 1 },
      { id: "q_cgm_high", label: "High alert threshold", type: "number", unit: "mg/dL", default: 180, min: 140, max: 250, step: 5 },
    ],
    analyze: (a) => {
      const { last, trend, level } = glucoseViz(a);
      const notes = [note("al", level === "ok" ? "good" : level === "low" ? "error" : "warning", `Current: ${last} mg/dL ${trend.arrow} — ${level === "ok" ? "in range" : level === "low" ? "LOW alert" : "HIGH alert"}`, `Trend ${trend.rate} mg/dL per min.`)];
      return { notes, metrics: [{ label: "Current", value: `${last} mg/dL`, tone: level === "ok" ? "good" : level === "low" ? "error" : "warning" }, { label: "Trend", value: trend.arrow }, { label: "Battery", value: "OK", tone: "good" }, { label: "Comm", value: a.q_cgm_retransmit === "on" ? "Reliable" : "Best-effort" }] };
    },
    visualize: (a) => {
      const { values, low, high } = glucoseViz(a);
      const lowLine = values.map(() => low);
      const highLine = values.map(() => high);
      return (
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Glucose with alert band ({low}–{high} mg/dL)</p>
          <Waveform series={[{ data: values, color: C_GLU, width: 1.6 }, { data: lowLine, color: "hsl(0 72% 55%)", width: 1, dashed: true }, { data: highLine, color: "hsl(0 72% 55%)", width: 1, dashed: true }]} height={150} />
        </div>
      );
    },
  },
  {
    id: "review",
    title: "Design review & report",
    subtitle: "Generate your scored CGM report.",
    concept: { title: "defend the design", body: "Tie sampling interval, calibration strategy, reliability and alert thresholds back to safe, actionable glucose monitoring." },
    fields: [{ id: "q_cgm_justify", label: "Justify your key trade-off", type: "textarea", placeholder: "e.g. chose 5-min sampling + retransmission to guarantee alerts without draining the battery…" }],
    visualize: (a) => {
      const sections: ReportSection[] = [
        { title: "Problem", rows: [["User", a.q_cgm_user ?? "—"], ["Interval", `${a.q_cgm_interval ?? "—"} min`], ["Wear target", `${a.q_cgm_battery ?? "—"} days`]] },
        { title: "Sensor & sampling", rows: [["Calibration", a.q_cgm_calib ?? "—"], ["Drift strategy", a.q_cgm_drift ?? "—"]] },
        { title: "Reliability & alerts", rows: [["Packet loss", `${a.q_cgm_loss ?? 0}%`], ["Retransmission", a.q_cgm_retransmit ?? "—"], ["Low / high", `${a.q_cgm_low ?? 70} / ${a.q_cgm_high ?? 180} mg/dL`]] },
      ];
      return <DeviceReport labId="cgm" title="CGM (conceptual)" answers={a} rubric={CGM_RUBRIC} sections={sections} />;
    },
  },
];
