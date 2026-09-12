// Design challenges + final assessment — all scored via the shared scoring engine.
import { runRubric, Rubric, ScoreResult } from "@/lib/scoring";
import { CoachNote } from "@/lib/coach";
import { scoreWireless, WIRELESS } from "@/lib/wireless";
import { computeTradeoffs, sensorSpec } from "@/lib/deviceBuilder";

export interface Submission {
  sensor: string;
  wireless: string;
  edge: string;
  power: string;
  fs?: number;
  justify?: string;
}

export interface Challenge {
  id: string;
  name: string;
  brief: string;
  requiredSensors: string[];
  rangeM: number;
  minBatteryDays: number;
  maxLatencyMs: number;
  minReliability: number;
}

export const CHALLENGES: Challenge[] = [
  { id: "fall", name: "Fall-detection wearable", brief: "A wrist/hip wearable that detects falls and alerts a carer. Must run for days on a small battery and work while the wearer moves.", requiredSensors: ["accel"], rangeM: 10, minBatteryDays: 3, maxLatencyMs: 1000, minReliability: 3 },
  { id: "ecgpatch", name: "Wireless ECG monitoring patch", brief: "An adhesive chest patch streaming ECG to a phone for ambulatory monitoring. Needs reliable, low-latency delivery and a multi-day battery.", requiredSensors: ["ecg"], rangeM: 10, minBatteryDays: 2, maxLatencyMs: 1000, minReliability: 4 },
  { id: "homepox", name: "Home pulse-oximeter system", brief: "A home SpO₂ device reporting to a hub/cloud for a patient recovering at home. Low data rate, tolerant latency, easy to use.", requiredSensors: ["ppg", "spo2"], rangeM: 15, minBatteryDays: 2, maxLatencyMs: 5000, minReliability: 3 },
  { id: "implant", name: "Implant telemetry link", brief: "An implanted device read intermittently under an extreme power constraint and very short range. Battery life is paramount.", requiredSensors: ["ecg", "custom", "glucose"], rangeM: 2, minBatteryDays: 7, maxLatencyMs: 2000, minReliability: 4 },
];

function toCoach(result: ScoreResult): CoachNote[] {
  return result.breakdown.map((b) => ({
    id: b.id,
    severity: b.ratio >= 0.85 ? "good" : b.ratio >= 0.5 ? "warning" : "error",
    title: `${b.label} — ${Math.round(b.ratio * 100)}%`,
    detail: b.note,
  }));
}

export function evaluateChallenge(ch: Challenge, sub: Submission): { result: ScoreResult; notes: CoachNote[]; tradeoffs: ReturnType<typeof computeTradeoffs> } {
  const to = computeTradeoffs(sub.sensor, sub.wireless, sub.edge, sub.power);
  const techName = WIRELESS.find((t) => t.id === sub.wireless)?.name ?? "—";
  const rubric: Rubric<Submission> = [
    { id: "sensor", label: "Sensor choice", weight: 20, evaluate: () => {
      const ok = ch.requiredSensors.includes(sub.sensor);
      return { ratio: ok ? 1 : 0.2, note: ok ? `${sensorSpec(sub.sensor).label} is appropriate for this challenge.` : `${sensorSpec(sub.sensor).label} does not match what this application measures.` };
    } },
    { id: "wireless", label: "Wireless technology", weight: 25, evaluate: () => {
      const { ratio } = scoreWireless(sub.wireless, { rangeM: ch.rangeM, dataRateKbps: Math.max(0.1, to.effKbps), battery: true, latencyMs: ch.maxLatencyMs });
      return { ratio, note: ratio >= 0.85 ? `${techName} is well-matched to the range/power/data-rate needs.` : ratio >= 0.5 ? `${techName} works but carries trade-off penalties here.` : `${techName} is inappropriate for this requirement.` };
    } },
    { id: "power", label: "Power / battery", weight: 25, evaluate: () => {
      const ratio = Math.min(1, to.batteryDays / ch.minBatteryDays);
      return { ratio, note: `Battery life ≈ ${to.batteryDays} d vs target ≥ ${ch.minBatteryDays} d.${ratio < 1 ? " Reduce duty cycle or transmit less." : ""}` };
    } },
    { id: "latency", label: "Latency", weight: 15, evaluate: () => {
      const ok = to.latencyMs <= ch.maxLatencyMs;
      return { ratio: ok ? 1 : 0.3, note: `Link latency ~${to.latencyMs} ms vs limit ${ch.maxLatencyMs} ms.` };
    } },
    { id: "reliability", label: "Reliability", weight: 15, evaluate: () => {
      const ratio = Math.min(1, to.reliability / ch.minReliability);
      return { ratio, note: `Reliability ${to.reliability}/5 vs target ≥ ${ch.minReliability}/5.` };
    } },
  ];
  const result = runRubric(rubric, sub);
  return { result, notes: toCoach(result), tradeoffs: to };
}

export function evaluateFinal(sub: Submission): { result: ScoreResult; notes: CoachNote[] } {
  const to = computeTradeoffs(sub.sensor, sub.wireless, sub.edge, sub.power);
  const bw = sensorSpec(sub.sensor).bandwidth;
  const fs = sub.fs ?? 0;
  const rubric: Rubric<Submission> = [
    { id: "architecture", label: "Architecture", weight: 15, evaluate: () => {
      const filled = [sub.sensor, sub.wireless, sub.edge, sub.power].filter(Boolean).length;
      return { ratio: filled / 4, note: filled === 4 ? "Complete end-to-end pipeline defined." : "Some pipeline stages are undefined." };
    } },
    { id: "sensor", label: "Sensor choice", weight: 10, evaluate: () => ({ ratio: sub.sensor ? 1 : 0, note: sub.sensor ? `${sensorSpec(sub.sensor).label} selected.` : "No sensor." }) },
    { id: "wireless", label: "Wireless technology", weight: 20, evaluate: () => {
      const { ratio } = scoreWireless(sub.wireless, { rangeM: 10, dataRateKbps: Math.max(0.1, to.effKbps), battery: sub.power !== "alwayson", latencyMs: 2000 });
      return { ratio, note: ratio >= 0.85 ? "Radio well-matched." : ratio >= 0.5 ? "Radio workable with trade-offs." : "Wireless technology is inappropriate." };
    } },
    { id: "power", label: "Power strategy", weight: 15, evaluate: () => ({ ratio: Math.min(1, to.batteryDays / 7), note: `Battery life ≈ ${to.batteryDays} d.` }) },
    { id: "sampling", label: "Sampling / ADC", weight: 15, evaluate: () => {
      const ok = fs >= 2 * bw;
      return { ratio: ok ? (fs > 8 * bw ? 0.8 : 1) : 0.4, note: ok ? (fs > 8 * bw ? "Above Nyquist but somewhat over-sampled." : "Sampling satisfies Nyquist.") : `Nyquist violated — need fs ≥ ${2 * bw} Hz for a ${bw} Hz signal.` };
    } },
    { id: "reliability", label: "Reliability", weight: 10, evaluate: () => ({ ratio: to.reliability / 5, note: `Link reliability ${to.reliability}/5.` }) },
    { id: "latency", label: "Latency", weight: 10, evaluate: () => ({ ratio: 1 - Math.min(1, to.latencyMs / 1000), note: `Link latency ~${to.latencyMs} ms.` }) },
    { id: "justification", label: "Justification", weight: 5, evaluate: () => ({ ratio: Math.min(1, (sub.justify ?? "").trim().length / 120), note: (sub.justify ?? "").length > 60 ? "Design decisions justified." : "Add reasoning for your trade-offs." }) },
  ];
  const result = runRubric(rubric, sub);
  return { result, notes: toCoach(result) };
}
