// "Build Your Own" device model + live engineering trade-off computation.
import { WIRELESS } from "@/lib/wireless";
import { edgeMode, computeBattery, EDGE_MODES } from "@/lib/power";

export interface SensorSpec {
  id: string;
  label: string;
  sampleRate: number; // Hz
  bits: number;
  channels: number;
  bandwidth: number; // Hz
}

export const SENSOR_SPECS: SensorSpec[] = [
  { id: "ecg", label: "ECG", sampleRate: 500, bits: 12, channels: 1, bandwidth: 40 },
  { id: "ppg", label: "PPG", sampleRate: 200, bits: 12, channels: 1, bandwidth: 10 },
  { id: "spo2", label: "SpO₂ (red/IR)", sampleRate: 100, bits: 16, channels: 2, bandwidth: 10 },
  { id: "glucose", label: "Glucose (CGM)", sampleRate: 0.0033, bits: 12, channels: 1, bandwidth: 0.01 },
  { id: "accel", label: "Accelerometer (motion)", sampleRate: 100, bits: 12, channels: 3, bandwidth: 45 },
  { id: "custom", label: "Custom", sampleRate: 250, bits: 12, channels: 1, bandwidth: 50 },
];

export function sensorSpec(id: string): SensorSpec {
  return SENSOR_SPECS.find((s) => s.id === id) ?? SENSOR_SPECS[SENSOR_SPECS.length - 1];
}

export interface PowerStrategy {
  id: string;
  label: string;
  duty: number;
}

export const POWER_STRATEGIES: PowerStrategy[] = [
  { id: "alwayson", label: "Always-on", duty: 1 },
  { id: "balanced", label: "Balanced duty-cycle", duty: 0.1 },
  { id: "lowpower", label: "Ultra-low-power", duty: 0.02 },
];

export function powerStrategy(id: string): PowerStrategy {
  return POWER_STRATEGIES.find((p) => p.id === id) ?? POWER_STRATEGIES[1];
}

const TX_MA: Record<number, number> = { 1: 10, 2: 15, 3: 25, 4: 60, 5: 120 };

export interface Tradeoffs {
  rawKbps: number;
  effKbps: number;
  rangeM: number;
  latencyMs: number;
  reliability: number; // 1..5
  cost: number; // 1..5
  avgCurrentMa: number;
  batteryDays: number;
  // 0..1 bar scores
  bars: Record<"power" | "range" | "dataRate" | "latency" | "reliability" | "cost" | "battery", number>;
}

export function computeTradeoffs(sensorId: string, wirelessId: string, edgeId: string, powerId: string): Tradeoffs {
  const s = sensorSpec(sensorId);
  const tech = WIRELESS.find((t) => t.id === wirelessId) ?? WIRELESS[0];
  const em = edgeMode(edgeId);
  const strat = powerStrategy(powerId);

  const rawBps = s.sampleRate * s.bits * s.channels;
  const effBps = rawBps / em.reductionFactor;
  const rawKbps = rawBps / 1000;
  const effKbps = effBps / 1000;

  const txMa = TX_MA[tech.power] ?? 20;
  const battery = computeBattery(
    [
      { label: "Sensor", currentMa: 0.5, duty: 1 },
      { label: "MCU", currentMa: 8 * em.powerRel, duty: strat.duty },
      { label: "Radio TX", currentMa: txMa, duty: strat.duty * 0.5 },
      { label: "Sleep", currentMa: 0.01, duty: Math.max(0, 1 - strat.duty) },
    ],
    250,
  );

  return {
    rawKbps,
    effKbps,
    rangeM: tech.rangeM,
    latencyMs: tech.latencyMs,
    reliability: tech.reliability,
    cost: tech.cost,
    avgCurrentMa: battery.avgCurrentMa,
    batteryDays: battery.days,
    bars: {
      power: Math.max(0, 1 - Math.min(1, battery.avgCurrentMa / 15)),
      range: Math.min(1, Math.log10(tech.rangeM + 1) / Math.log10(100000)),
      dataRate: Math.min(1, effKbps / 100),
      latency: 1 - Math.min(1, tech.latencyMs / 1000),
      reliability: tech.reliability / 5,
      cost: 1 - (tech.cost - 1) / 4,
      battery: Math.min(1, battery.days / 14),
    },
  };
}

export const EDGE_OPTIONS = EDGE_MODES.map((m) => ({ value: m.id, label: m.label }));
