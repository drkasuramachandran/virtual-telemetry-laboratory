import React from "react";
import { WizardStageConfig, Answers } from "@/components/wizard/types";
import { Rubric } from "@/lib/scoring";
import { DeviceReport, ReportSection } from "@/components/DeviceReport";
import { NyquistView } from "@/components/NyquistView";
import { note } from "@/lib/coach";
import { WIRELESS, scoreWireless, LinkRequirements } from "@/lib/wireless";
import { computeAdc, formatBytes, EDGE_MODES, edgeMode } from "@/lib/power";
import { SENSOR_SPECS, POWER_STRATEGIES, computeTradeoffs, sensorSpec } from "@/lib/deviceBuilder";

const num = (a: Answers, id: string, f: number) => (a[id] !== undefined && a[id] !== "" && Number.isFinite(Number(a[id])) ? Number(a[id]) : f);
const bw = (a: Answers) => num(a, "q_bandwidth", 50);

function req(a: Answers): LinkRequirements {
  const to = computeTradeoffs(a.q_sensor_type, a.q_wireless, a.q_edge || "raw", a.q_power_strategy || "balanced");
  return { rangeM: 10, dataRateKbps: Math.max(0.1, to.effKbps), battery: a.q_battery !== "mains", latencyMs: a.q_latency === "realtime" ? 1000 : 5000 };
}

export const CUSTOM_RUBRIC: Rubric<Answers> = [
  { id: "problem", label: "Problem definition", weight: 15, evaluate: (a) => {
    const filled = ["q_user", "q_bandwidth", "q_latency", "q_battery"].filter((k) => a[k]).length;
    return { ratio: filled / 4, note: filled === 4 ? "Requirements specified." : "Complete the requirements." };
  } },
  { id: "sensor", label: "Sensor selection", weight: 15, evaluate: (a) => ({ ratio: a.q_sensor_type ? ((a.q_sensor_justify ?? "").length > 25 ? 1 : 0.7) : 0, note: a.q_sensor_type ? "Sensor chosen." : "No sensor selected." }) },
  { id: "conditioning", label: "Signal conditioning", weight: 15, evaluate: (a) => {
    const lp = num(a, "q_lp", 150); let r = 1; const n = [];
    if (lp < bw(a)) { r -= 0.4; n.push("low-pass below signal bandwidth attenuates real content"); }
    if (num(a, "q_hp", 0.5) > 1) { r -= 0.2; n.push("high-pass too aggressive"); }
    return { ratio: Math.max(0, r), note: n.length ? n.join("; ") : "Conditioning matches the signal band." };
  } },
  { id: "adc", label: "Sampling / ADC", weight: 15, evaluate: (a) => {
    const m = computeAdc(num(a, "q_fs", 500), num(a, "q_bits", 12), bw(a));
    return { ratio: m.nyquistViolated ? 0.4 : num(a, "q_bits", 12) < 10 ? 0.8 : 1, note: m.nyquistViolated ? "Nyquist violated — aliasing will occur." : "Sampling satisfies Nyquist." };
  } },
  { id: "wireless", label: "Wireless selection", weight: 20, evaluate: (a) => {
    const { ratio } = scoreWireless(a.q_wireless, req(a));
    return { ratio, note: ratio >= 0.85 ? "Well-matched radio." : ratio >= 0.5 ? "Workable with trade-offs." : "Wireless technology is inappropriate for this requirement." };
  } },
  { id: "power", label: "Power management", weight: 20, evaluate: (a) => {
    const to = computeTradeoffs(a.q_sensor_type, a.q_wireless, a.q_edge || "raw", a.q_power_strategy || "balanced");
    let r = to.batteryDays >= 7 ? 1 : to.batteryDays >= 2 ? 0.75 : 0.4;
    return { ratio: r, note: `Estimated battery life ≈ ${to.batteryDays} days.${a.q_power_strategy === "alwayson" ? " Always-on dominates the energy budget — consider duty-cycling." : ""}` };
  } },
];

export const CUSTOM_STAGES: WizardStageConfig[] = [
  {
    id: "define",
    title: "Define the problem",
    concept: { title: "requirements first", body: "Your sensor, filters, sampling rate, radio and power budget are all consequences of the requirements. Pin them down first." },
    fields: [
      { id: "q_user", label: "Deployment", type: "select", options: [{ value: "clinical", label: "Clinical" }, { value: "home", label: "Home" }, { value: "wearable", label: "Wearable" }, { value: "field", label: "Field / remote" }] },
      { id: "q_bandwidth", label: "Signal bandwidth", type: "number", unit: "Hz", default: 50, min: 0.01, max: 500 },
      { id: "q_latency", label: "Latency tolerance", type: "select", options: [{ value: "realtime", label: "Real-time (<1 s)" }, { value: "seconds", label: "Seconds" }, { value: "minutes", label: "Minutes" }] },
      { id: "q_battery", label: "Power source", type: "radio", options: [{ value: "battery", label: "Battery" }, { value: "mains", label: "Mains" }] },
    ],
    analyze: () => ({ notes: [note("d", "info", "Custom device", "You assembled this device in Build-Your-Own; the guided workflow validates each engineering choice.")] }),
  },
  {
    id: "sensor",
    title: "Sensor",
    concept: { title: "transducer defines the signal", body: "The sensor sets the signal type, bandwidth and noise you must handle downstream." },
    fields: [
      { id: "q_sensor_type", label: "Sensor", type: "select", options: SENSOR_SPECS.map((s) => ({ value: s.id, label: s.label })) },
      { id: "q_sensor_justify", label: "Justify your choice", type: "textarea", placeholder: "Signal type, bandwidth, expected noise sources…" },
    ],
    analyze: (a) => ({ notes: [a.q_sensor_type ? note("s", "good", `${sensorSpec(a.q_sensor_type).label} selected`, `Nominal bandwidth ${sensorSpec(a.q_sensor_type).bandwidth} Hz.`) : note("s2", "warning", "Choose a sensor")] }),
  },
  {
    id: "conditioning",
    title: "Signal conditioning",
    concept: { title: "clean before digitising", body: "Amplify and filter to remove drift, mains and out-of-band noise while keeping the signal band intact." },
    fields: [
      { id: "q_gain", label: "Gain", type: "slider", min: 1, max: 2000, step: 1, default: 100, unit: "×" },
      { id: "q_hp", label: "High-pass", type: "number", unit: "Hz", default: 0.5, min: 0.01, max: 10, step: 0.05 },
      { id: "q_lp", label: "Low-pass", type: "number", unit: "Hz", default: 150, min: 1, max: 400, step: 1 },
      { id: "q_notch", label: "Notch", type: "radio", default: "50", options: [{ value: "50", label: "50 Hz" }, { value: "60", label: "60 Hz" }, { value: "0", label: "Off" }] },
    ],
    analyze: (a) => {
      const n = [];
      if (num(a, "q_lp", 150) < bw(a)) n.push(note("lp", "error", "Low-pass below signal bandwidth", "You are attenuating real signal content.", `Raise the cutoff to ≥ ${bw(a)} Hz.`));
      if (num(a, "q_hp", 0.5) > 1) n.push(note("hp", "warning", "High-pass is aggressive", "May distort low-frequency morphology."));
      if (n.length === 0) n.push(note("c", "good", "Conditioning matches the signal band"));
      return { notes: n };
    },
  },
  {
    id: "adc",
    title: "ADC & sampling",
    concept: { title: "Nyquist", body: "Sample above twice the bandwidth or high frequencies alias into the band and cannot be removed." },
    fields: [
      { id: "q_fs", label: "Sampling frequency", type: "number", unit: "Hz", default: 500, min: 1, max: 2000, step: 1 },
      { id: "q_bits", label: "Resolution", type: "select", default: "12", options: [{ value: "8", label: "8-bit" }, { value: "10", label: "10-bit" }, { value: "12", label: "12-bit" }, { value: "16", label: "16-bit" }] },
    ],
    analyze: (a) => {
      const m = computeAdc(num(a, "q_fs", 500), num(a, "q_bits", 12), bw(a));
      return {
        notes: [m.nyquistViolated ? note("n", "error", "Nyquist violated", "Aliasing will corrupt the signal.", `Raise fs above ${2 * bw(a)} Hz.`) : note("n2", "good", "Sampling satisfies Nyquist")],
        metrics: [{ label: "Nyquist", value: `${m.nyquist} Hz` }, { label: "Data rate", value: `${m.rawDataRateBps} bps` }, { label: "Per day", value: formatBytes(m.dailyBytes) }],
      };
    },
    visualize: (a) => <NyquistView bandwidth={bw(a)} fs={num(a, "q_fs", 500)} />,
  },
  {
    id: "edge",
    title: "Edge processing",
    concept: { title: "compute to save the radio", body: "Sending features or events instead of raw samples slashes data and radio energy." },
    fields: [{ id: "q_edge", label: "Strategy", type: "select", default: "raw", options: EDGE_MODES.map((m) => ({ value: m.id, label: m.label })) }],
    analyze: (a) => {
      const em = edgeMode(a.q_edge || "raw");
      return { notes: [note("e", "info", em.label, em.desc)], metrics: [{ label: "Data reduction", value: `${em.reductionFactor}×`, tone: "good" }] };
    },
  },
  {
    id: "wireless",
    title: "Wireless technology",
    concept: { title: "match the link to the need", body: "Trade range vs power vs data rate vs latency vs cost against your requirements." },
    fields: [{ id: "q_wireless", label: "Technology", type: "select", options: WIRELESS.map((w) => ({ value: w.id, label: w.name })) }],
    analyze: (a) => {
      const { ratio, notes } = scoreWireless(a.q_wireless, req(a));
      return { notes, metrics: [{ label: "Match", value: `${Math.round(ratio * 100)}%`, tone: ratio >= 0.85 ? "good" : ratio >= 0.5 ? "warning" : "error" }] };
    },
  },
  {
    id: "power",
    title: "Power strategy",
    concept: { title: "duty cycle sets battery life", body: "Average current — driven mostly by how often the radio wakes — determines lifetime." },
    fields: [{ id: "q_power_strategy", label: "Power strategy", type: "select", default: "balanced", options: POWER_STRATEGIES.map((p) => ({ value: p.id, label: p.label })) }],
    analyze: (a) => {
      const to = computeTradeoffs(a.q_sensor_type, a.q_wireless, a.q_edge || "raw", a.q_power_strategy || "balanced");
      return {
        notes: [note("p", to.batteryDays >= 7 ? "good" : to.batteryDays >= 2 ? "warning" : "error", `Battery life ≈ ${to.batteryDays} days`, a.q_power_strategy === "alwayson" ? "Always-on dominates the budget — duty-cycle to extend life." : "Duty-cycling extends life substantially.")],
        metrics: [{ label: "Avg current", value: `${to.avgCurrentMa} mA` }, { label: "Battery life", value: `~${to.batteryDays} days`, tone: to.batteryDays >= 7 ? "good" : to.batteryDays >= 2 ? "warning" : "error" }],
      };
    },
  },
  {
    id: "review",
    title: "Design review & report",
    concept: { title: "defend the whole system", body: "Every choice should follow from the requirements and the trade-offs you accepted." },
    fields: [{ id: "q_justify", label: "Justify your biggest trade-off", type: "textarea", placeholder: "Tie your choices back to the requirements…" }],
    visualize: (a) => {
      const tech = WIRELESS.find((t) => t.id === a.q_wireless);
      const to = computeTradeoffs(a.q_sensor_type, a.q_wireless, a.q_edge || "raw", a.q_power_strategy || "balanced");
      const sections: ReportSection[] = [
        { title: "Problem & sensor", rows: [["Deployment", a.q_user ?? "—"], ["Sensor", a.q_sensor_type ?? "—"], ["Bandwidth", `${bw(a)} Hz`], ["Latency", a.q_latency ?? "—"]] },
        { title: "Conditioning & ADC", rows: [["Gain", `${a.q_gain}×`], ["HP / LP", `${a.q_hp} / ${a.q_lp} Hz`], ["Sampling", `${a.q_fs} Hz, ${a.q_bits}-bit`]] },
        { title: "Link & power", rows: [["Edge", a.q_edge ?? "—"], ["Wireless", tech?.name ?? "—"], ["Power", a.q_power_strategy ?? "—"], ["Battery", `~${to.batteryDays} days`]] },
      ];
      return <DeviceReport labId={a.q_project_lab || "custom"} title="Custom Telemetry Device" answers={a} rubric={CUSTOM_RUBRIC} sections={sections} />;
    },
  },
];
